import { describe, expect, it } from "vitest";
import { DEFAULT_QUERIES } from "@/lib/discovery/queries";
import { parseSourcesConfig, subredditFromUrl, sourcesFromRows } from "@/lib/discovery/sources";

describe("DEFAULT_QUERIES", () => {
  it("has English and Russian queries", () => {
    expect(DEFAULT_QUERIES.some((q) => /career change/i.test(q))).toBe(true);
    expect(DEFAULT_QUERIES.some((q) => /[а-яё]/i.test(q))).toBe(true);
    expect(new Set(DEFAULT_QUERIES).size).toBe(DEFAULT_QUERIES.length);
  });
});

describe("subredditFromUrl", () => {
  it("finds the subreddit name", () => {
    expect(subredditFromUrl("https://www.reddit.com/r/careerguidance/")).toBe("careerguidance");
    expect(subredditFromUrl("https://reddit.com/r/AskReddit/top")).toBe("AskReddit");
    expect(subredditFromUrl("https://old.reddit.com/r/cscareerquestions")).toBe("cscareerquestions");
  });
  it("returns null for anything else", () => {
    expect(subredditFromUrl("https://example.com/r/x")).toBeNull();
    expect(subredditFromUrl("https://www.reddit.com/user/x")).toBeNull();
    expect(subredditFromUrl("nope")).toBeNull();
  });
});

describe("parseSourcesConfig", () => {
  it("accepts a valid file", () => {
    const c = parseSourcesConfig({ queries: ["a b"], reddit: { subreddits: ["careerguidance"] }, feeds: [{ name: "Blog", url: "https://blog.example.org/feed.xml" }] });
    expect(c.ok).toBe(true);
    if (c.ok) {
      expect(c.config.feeds).toHaveLength(1);
      expect(c.config.queries).toEqual(["a b"]);
    }
  });
  it("fills defaults", () => {
    const c = parseSourcesConfig({});
    expect(c.ok && c.config.feeds).toEqual([]);
    expect(c.ok && c.config.queries).toBe(undefined);
  });
  it("rejects non-http feed addresses and says why", () => {
    const c = parseSourcesConfig({ feeds: [{ name: "Bad", url: "javascript:alert(1)" }] });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.error).toMatch(/feeds/);
  });
  it("rejects a non-object", () => {
    expect(parseSourcesConfig("x").ok).toBe(false);
    expect(parseSourcesConfig(null).ok).toBe(false);
  });
});

describe("sourcesFromRows (story_sources table)", () => {
  it("turns rss and reddit rows into feeds and subreddits and reports the rest as skipped", () => {
    const r = sourcesFromRows([
      { url: "https://blog.example.org/feed.xml", name: "Blog", kind: "rss" },
      { url: "https://www.reddit.com/r/careerguidance/", name: "CG", kind: "reddit" },
      { url: "https://www.reddit.com/user/x", name: "bad", kind: "reddit" },
      { url: "https://site.example.org/", name: "Site", kind: "website" },
      { url: "javascript:1", name: "evil", kind: "rss" },
    ]);
    expect(r.feeds).toEqual([{ name: "Blog", url: "https://blog.example.org/feed.xml" }]);
    expect(r.subreddits).toEqual(["careerguidance"]);
    expect(r.skipped).toHaveLength(3);
    expect(r.skipped.map((s) => s.url)).toContain("https://site.example.org/");
  });
});
