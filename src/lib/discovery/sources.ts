import { z } from "zod";
import { isHttpUrl } from "@/lib/data/http-url";

export interface FeedSource {
  name: string;
  url: string;
}

const feedSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().refine(isHttpUrl, { message: "only http and https addresses are allowed" }),
});

/** scripts/sources.json */
export const sourcesConfigSchema = z.object({
  queries: z.array(z.string().trim().min(2).max(200)).min(1).max(30).optional(),
  reddit: z.object({ subreddits: z.array(z.string().trim().regex(/^[A-Za-z0-9_]{2,21}$/)).max(30).default([]) }).default({ subreddits: [] }),
  feeds: z.array(feedSchema).max(100).default([]),
});
export type SourcesConfig = z.infer<typeof sourcesConfigSchema>;

export type ParsedConfig = { ok: true; config: SourcesConfig } | { ok: false; error: string };

export function parseSourcesConfig(raw: unknown): ParsedConfig {
  const r = sourcesConfigSchema.safeParse(raw);
  if (r.success) return { ok: true, config: r.data };
  const issue = r.error.issues[0];
  return { ok: false, error: `${issue.path.join(".") || "(root)"}: ${issue.message}` };
}

/** "https://www.reddit.com/r/careerguidance/top" -> "careerguidance"; null if it is not a subreddit address. */
export function subredditFromUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (host !== "reddit.com" && !host.endsWith(".reddit.com")) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts[0] !== "r" || !parts[1]) return null;
  return /^[A-Za-z0-9_]{2,21}$/.test(parts[1]) ? parts[1] : null;
}

export interface SourceRow {
  url: string;
  name: string | null;
  kind: string;
}

/** Sorts rows of the `story_sources` table into feeds and subreddits; everything else is reported as skipped. */
export function sourcesFromRows(rows: SourceRow[]): { feeds: FeedSource[]; subreddits: string[]; skipped: { url: string; reason: string }[] } {
  const feeds: FeedSource[] = [];
  const subreddits: string[] = [];
  const skipped: { url: string; reason: string }[] = [];
  for (const row of rows) {
    if (row.kind === "rss") {
      if (!isHttpUrl(row.url)) skipped.push({ url: row.url, reason: "not an http(s) address" });
      else feeds.push({ name: row.name?.trim() || new URL(row.url).hostname, url: row.url });
    } else if (row.kind === "reddit") {
      const sub = subredditFromUrl(row.url);
      if (sub) {
        if (!subreddits.includes(sub)) subreddits.push(sub);
      } else skipped.push({ url: row.url, reason: "not a subreddit address (expected https://www.reddit.com/r/<name>)" });
    } else {
      skipped.push({ url: row.url, reason: `kind "${row.kind}" has no automatic reader (only rss and reddit)` });
    }
  }
  return { feeds, subreddits, skipped };
}
