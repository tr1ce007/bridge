/**
 * Story source discovery for THE BRIDGE.
 *
 * Looks for public, first-person stories of people who changed their path (Reddit through the official
 * OAuth API, RSS/Atom feeds from the `story_sources` table or scripts/sources.json) and writes them as
 * DRAFTS for manual review. It never publishes anything: every draft is `kind: documented`,
 * `status: pending`; a moderator approves it in /admin.
 *
 *   npm run discover                 write scripts/out/discovered-<date>.json
 *   npm run discover -- --insert     also insert the drafts into Supabase as pending stories
 *   npm run discover -- --help
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { toDraft } from "@/lib/discovery/draft";
import { extractFields } from "@/lib/discovery/extract";
import { parseFeed } from "@/lib/discovery/feed";
import { toStoryRow } from "@/lib/discovery/insert";
import { createPoliteFetcher, createRobotsChecker } from "@/lib/discovery/net";
import { DEFAULT_QUERIES } from "@/lib/discovery/queries";
import { parseRedditListing, redditSearchUrl, REDDIT_USER_AGENT } from "@/lib/discovery/reddit";
import { parseSourcesConfig, sourcesFromRows, type FeedSource } from "@/lib/discovery/sources";
import type { DiscoveredItem, StoryDraft } from "@/lib/discovery/types";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPTS_DIR, "..");
const SOURCES_FILE = join(SCRIPTS_DIR, "sources.json");
const OUT_DIR = join(SCRIPTS_DIR, "out");

const HELP = `THE BRIDGE: story source discovery (drafts for manual review, nothing is published)

Usage: npm run discover -- [options]

  --insert        also insert the drafts into Supabase as PENDING stories (needs
                  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY). A moderator must approve them in /admin.
  --no-ai         do not extract structured fields with the AI provider
  --limit <n>     results per search or per feed (default 10, max 50)
  --max-ai <n>    at most n drafts go to the AI provider (default 25)
  --help          show this text

Sources:
  Reddit   needs REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (a "script" or "web" app at reddit.com/prefs/apps)
  Feeds    rows of the story_sources table (kind rss / reddit; read with the service role)
           or the local file scripts/sources.json (see scripts/sources.example.json)
AI (optional): ANTHROPIC_API_KEY or OPENAI_API_KEY. Without it drafts only hold the short excerpt.
Output: scripts/out/discovered-<date>.json (not committed to git).`;

interface Args {
  insert: boolean;
  noAi: boolean;
  limit: number;
  maxAi: number;
  help: boolean;
}

function parseArgs(argv: string[]): Args | { error: string } {
  const args: Args = { insert: false, noAi: false, limit: 10, maxAi: 25, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--insert") args.insert = true;
    else if (a === "--no-ai") args.noAi = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--limit" || a === "--max-ai") {
      const n = Number(argv[i + 1]);
      if (!Number.isInteger(n) || n < 0 || n > 200) return { error: `${a} needs a whole number from 0 to 200` };
      if (a === "--limit") args.limit = Math.min(Math.max(n, 1), 50);
      else args.maxAi = n;
      i += 1;
    } else return { error: `Unknown option: ${a} (see --help)` };
  }
  return args;
}

function fail(lines: string[]): never {
  console.error(lines.join("\n"));
  process.exit(1);
}

function loadEnvFiles(): void {
  for (const name of [".env.local", ".env"]) {
    const file = join(ROOT, name);
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file); // variables that are already set are kept
    } catch {
      console.error(`Warning: could not read ${name}`);
    }
  }
}

const env = (name: string): string => process.env[name]?.trim() ?? "";

async function getRedditToken(fetcher: ReturnType<typeof createPoliteFetcher>): Promise<{ token: string } | { error: string }> {
  const basic = Buffer.from(`${env("REDDIT_CLIENT_ID")}:${env("REDDIT_CLIENT_SECRET")}`).toString("base64");
  const res = await fetcher.fetchText("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return { error: `Reddit refused the credentials or is unreachable (HTTP ${res.status || "no answer"}${res.error ? `: ${res.error}` : ""})` };
  try {
    const token = (JSON.parse(res.text) as { access_token?: unknown }).access_token;
    if (typeof token === "string" && token) return { token };
  } catch {
    // fall through
  }
  return { error: "Reddit answered without an access token" };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) fail([parsed.error]);
  const args = parsed;
  if (args.help) {
    console.log(HELP);
    return;
  }
  loadEnvFiles();

  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseReady = Boolean(supabaseUrl && serviceKey);
  if (args.insert && !supabaseReady) {
    fail([
      "Cannot use --insert: Supabase is not configured.",
      `Missing: ${[!supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL", !serviceKey && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean).join(", ")}`,
      "Set them in .env.local (see README), or run without --insert to write a JSON file for manual review.",
    ]);
  }
  const supabase = supabaseReady ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

  // ---- sources
  const skipped: { source: string; reason: string }[] = [];
  let queries: readonly string[] = DEFAULT_QUERIES;
  const feeds: FeedSource[] = [];
  const subreddits: string[] = [];
  const addFeeds = (list: FeedSource[]) => {
    for (const f of list) if (!feeds.some((x) => x.url === f.url)) feeds.push(f);
  };

  if (existsSync(SOURCES_FILE)) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(SOURCES_FILE, "utf8"));
    } catch {
      fail([`scripts/sources.json is not valid JSON.`]);
    }
    const cfg = parseSourcesConfig(raw);
    if (!cfg.ok) fail([`scripts/sources.json is not valid: ${cfg.error}`]);
    if (cfg.config.queries) queries = cfg.config.queries;
    addFeeds(cfg.config.feeds);
    subreddits.push(...cfg.config.reddit.subreddits);
  }
  if (supabase) {
    const { data, error } = await supabase.from("story_sources").select("url,name,kind").is("story_id", null).limit(500);
    if (error) {
      skipped.push({ source: "story_sources table", reason: `could not read it (${error.message})` });
    } else {
      const fromDb = sourcesFromRows((data ?? []) as { url: string; name: string | null; kind: string }[]);
      addFeeds(fromDb.feeds);
      for (const s of fromDb.subreddits) if (!subreddits.includes(s)) subreddits.push(s);
      for (const s of fromDb.skipped) skipped.push({ source: s.url, reason: s.reason });
    }
  }

  const missingReddit = [!env("REDDIT_CLIENT_ID") && "REDDIT_CLIENT_ID", !env("REDDIT_CLIENT_SECRET") && "REDDIT_CLIENT_SECRET"].filter(Boolean);
  const redditReady = missingReddit.length === 0;
  if (!redditReady) skipped.push({ source: "Reddit", reason: `not configured (missing ${missingReddit.join(", ")})` });

  if (!redditReady && feeds.length === 0) {
    fail([
      "Nothing to search: no source is configured.",
      `- Reddit: missing ${missingReddit.join(", ")} (create an app at https://www.reddit.com/prefs/apps and put the id and secret in .env.local)`,
      "- Feeds: no RSS/Atom feeds found. Add rows to the story_sources table (kind rss) in /admin, or create scripts/sources.json (copy scripts/sources.example.json).",
      "Nothing was fetched and no file was written.",
    ]);
  }

  // ---- fetch
  const fetcher = createPoliteFetcher({ userAgent: REDDIT_USER_AGENT });
  const robotsAllows = createRobotsChecker(fetcher, REDDIT_USER_AGENT);
  const found: DiscoveredItem[] = [];

  if (redditReady) {
    console.log("Reddit: signing in (app-only)...");
    const auth = await getRedditToken(fetcher);
    if ("error" in auth) {
      skipped.push({ source: "Reddit", reason: auth.error });
    } else {
      const jobs: { query: string; subreddit?: string }[] = [];
      for (const q of queries) jobs.push({ query: q });
      for (const sub of subreddits) for (const q of queries) jobs.push({ query: q, subreddit: sub });
      let stop = false;
      for (const job of jobs) {
        if (stop) break;
        const label = job.subreddit ? `r/${job.subreddit} "${job.query}"` : `"${job.query}"`;
        const res = await fetcher.fetchText(redditSearchUrl(job.query, { subreddit: job.subreddit, limit: args.limit }), {
          headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/json" },
        });
        if (res.status === 429) {
          skipped.push({ source: "Reddit", reason: "rate limit reached (HTTP 429); stopped early" });
          stop = true;
        } else if (!res.ok) {
          skipped.push({ source: `Reddit ${label}`, reason: `HTTP ${res.status || "no answer"}${res.error ? `: ${res.error}` : ""}` });
          if (res.status === 401 || res.status === 403) stop = true;
        } else {
          let json: unknown = null;
          try {
            json = JSON.parse(res.text);
          } catch {
            skipped.push({ source: `Reddit ${label}`, reason: "answer is not JSON" });
          }
          const items = parseRedditListing(json);
          console.log(`Reddit ${label}: ${items.length} usable posts`);
          found.push(...items);
        }
      }
    }
  }

  for (const feed of feeds) {
    if (!(await robotsAllows(feed.url))) {
      skipped.push({ source: feed.url, reason: "robots.txt does not allow it (or could not be read); not fetched" });
      continue;
    }
    const res = await fetcher.fetchText(feed.url, {
      headers: { Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8" },
      allowRedirect: robotsAllows, // a redirect is checked against the robots.txt of its new address
    });
    if (!res.ok) {
      skipped.push({ source: feed.url, reason: `HTTP ${res.status || "no answer"}${res.error ? `: ${res.error}` : ""}` });
      continue;
    }
    const items = parseFeed(res.text, { name: feed.name }).slice(0, args.limit);
    if (items.length === 0) skipped.push({ source: feed.url, reason: "no usable items (not RSS/Atom, empty, or items without links)" });
    console.log(`Feed ${feed.name}: ${items.length} items`);
    found.push(...items);
  }

  // ---- drafts (one per source address)
  const unique = new Map<string, DiscoveredItem>();
  for (const item of found) if (!unique.has(item.sourceUrl)) unique.set(item.sourceUrl, item);
  const items = [...unique.values()];
  let drafts: StoryDraft[] = items.map(toDraft);

  // ---- optional AI extraction
  let aiProvider = "none";
  if (!args.noAi && drafts.length > 0) {
    // server-only is satisfied by running with --conditions=react-server (see the npm script)
    const { getProvider } = await import("@/lib/ai/provider");
    const provider = getProvider();
    aiProvider = provider.name;
    if (provider.name === "demo") {
      console.log("AI: no provider configured (ANTHROPIC_API_KEY or OPENAI_API_KEY); drafts keep only the excerpt, all fields incomplete.");
    } else {
      const count = Math.min(drafts.length, args.maxAi);
      console.log(`AI (${provider.name}): extracting fields for ${count} of ${drafts.length} drafts...`);
      for (let i = 0; i < count; i += 1) {
        drafts[i] = await extractFields(provider, items[i], drafts[i]);
      }
      if (drafts.length > count) {
        drafts = drafts.map((d, i) => (i >= count ? { ...d, notes: [...d.notes, "AI step skipped (over the --max-ai limit)"] } : d));
      }
    }
  }

  // ---- output
  const date = new Date().toISOString().slice(0, 10);
  mkdirSync(OUT_DIR, { recursive: true });
  let file = join(OUT_DIR, `discovered-${date}.json`);
  for (let n = 2; existsSync(file); n += 1) file = join(OUT_DIR, `discovered-${date}-${n}.json`); // never overwrite an earlier file
  const report = {
    generatedAt: new Date().toISOString(),
    note: "Drafts for manual review. Nothing here is published. Check each source, the attribution and personal data before approving in /admin.",
    ai: aiProvider,
    queries,
    counts: { drafts: drafts.length, skippedSources: skipped.length },
    skipped,
    drafts,
  };
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${drafts.length} draft(s) to ${file}`);
  for (const s of skipped) console.log(`Skipped: ${s.source}: ${s.reason}`);

  if (args.insert && supabase) {
    // Drafts the AI judged "not a personal story" stay in the JSON file (with a note) but are not inserted.
    const toInsert = drafts.filter((d) => !d.notPersonalStory);
    const heldBack = drafts.length - toInsert.length;
    if (heldBack > 0) console.log(`Not inserted: ${heldBack} draft(s) the AI flagged as not a personal story (see "notes" in ${file}).`);
    if (toInsert.length === 0) {
      console.log("Nothing to insert.");
    } else {
      // ignoreDuplicates: a story that is already in the table (maybe already moderated) is left untouched.
      const { data, error } = await supabase
        .from("stories")
        .upsert(toInsert.map(toStoryRow), { onConflict: "id", ignoreDuplicates: true })
        .select("id");
      if (error) fail([`Insert failed: ${error.message}`, `The JSON file above is still there: ${file}`]);
      const added = data?.length ?? 0;
      console.log(`Inserted ${added} new pending stor${added === 1 ? "y" : "ies"} (${toInsert.length - added} already existed). Moderators approve them in /admin.`);
    }
  }
}

main().catch((e) => {
  console.error(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
