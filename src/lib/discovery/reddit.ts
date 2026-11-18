import { collapseWhitespace, decodeEntities, toIsoDate } from "./text";
import type { DiscoveredItem } from "./types";

export const MAX_TEXT_CHARS = 8000;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Reads the JSON of a Reddit listing or search result (t3 posts only) into items.
 * Skips adult posts, removed or deleted posts and posts without text. Never throws.
 */
export function parseRedditListing(json: unknown): DiscoveredItem[] {
  const children = asRecord(asRecord(json)?.data)?.children;
  if (!Array.isArray(children)) return [];
  const items: DiscoveredItem[] = [];
  for (const child of children) {
    const c = asRecord(child);
    if (!c || c.kind !== "t3") continue;
    const d = asRecord(c.data);
    if (!d || d.over_18 === true) continue;
    const text = collapseWhitespace(decodeEntities(str(d.selftext)));
    if (!text || text === "[removed]" || text === "[deleted]" || d.removed_by_category) continue;
    const permalink = str(d.permalink);
    if (!permalink.startsWith("/r/")) continue;
    const title = collapseWhitespace(decodeEntities(str(d.title)));
    const subreddit = str(d.subreddit);
    const author = str(d.author);
    const hasHandle = author !== "" && author !== "[deleted]" && author !== "AutoModerator";
    const publishedAt = typeof d.created_utc === "number" ? toIsoDate(d.created_utc * 1000) : undefined;
    items.push({
      origin: "reddit",
      sourceUrl: `https://www.reddit.com${permalink}`,
      sourceName: subreddit ? `Reddit r/${subreddit}` : "Reddit",
      author: hasHandle ? author : null,
      ...(publishedAt ? { publishedAt } : {}),
      title,
      text: text.slice(0, MAX_TEXT_CHARS),
    });
  }
  return items;
}

export const REDDIT_USER_AGENT = "the-bridge-story-discovery/0.1";

/** Address of a Reddit search on the official OAuth API host. */
export function redditSearchUrl(query: string, options: { subreddit?: string; limit?: number } = {}): string {
  const params = new URLSearchParams({
    q: query,
    sort: "relevance",
    t: "year",
    type: "link",
    limit: String(Math.min(Math.max(options.limit ?? 10, 1), 100)),
    include_over_18: "false",
    raw_json: "1",
  });
  if (options.subreddit) {
    params.set("restrict_sr", "1");
    return `https://oauth.reddit.com/r/${encodeURIComponent(options.subreddit)}/search?${params}`;
  }
  return `https://oauth.reddit.com/search?${params}`;
}
