import { describe, expect, it } from "vitest";
import { isAllowedByRobots } from "@/lib/discovery/robots";

const UA = "the-bridge-story-discovery/0.1";

describe("isAllowedByRobots", () => {
  it("allows everything when the file is empty", () => {
    expect(isAllowedByRobots("", "/feed.xml", UA)).toBe(true);
  });

  it("applies the * group", () => {
    const txt = "User-agent: *\nDisallow: /private/\n";
    expect(isAllowedByRobots(txt, "/private/a", UA)).toBe(false);
    expect(isAllowedByRobots(txt, "/feed.xml", UA)).toBe(true);
  });

  it("blocks everything with Disallow: /", () => {
    expect(isAllowedByRobots("User-agent: *\nDisallow: /", "/anything", UA)).toBe(false);
  });

  it("treats an empty Disallow as allow all", () => {
    expect(isAllowedByRobots("User-agent: *\nDisallow:", "/x", UA)).toBe(true);
  });

  it("prefers a group written for our own agent over *", () => {
    const txt = "User-agent: *\nDisallow: /\n\nUser-agent: the-bridge-story-discovery\nAllow: /\n";
    expect(isAllowedByRobots(txt, "/feed", UA)).toBe(true);
    expect(isAllowedByRobots(txt, "/feed", "other-bot/1.0")).toBe(false);
  });

  it("takes the longest matching rule, and Allow wins a tie", () => {
    const txt = "User-agent: *\nDisallow: /blog/\nAllow: /blog/public/\n";
    expect(isAllowedByRobots(txt, "/blog/x", UA)).toBe(false);
    expect(isAllowedByRobots(txt, "/blog/public/x", UA)).toBe(true);
    const tie = "User-agent: *\nDisallow: /a\nAllow: /a\n";
    expect(isAllowedByRobots(tie, "/a", UA)).toBe(true);
  });

  it("supports * and $ in patterns", () => {
    const txt = "User-agent: *\nDisallow: /*.json$\nDisallow: /tmp*/x\n";
    expect(isAllowedByRobots(txt, "/data/file.json", UA)).toBe(false);
    expect(isAllowedByRobots(txt, "/data/file.json?x=1", UA)).toBe(true);
    expect(isAllowedByRobots(txt, "/tmp123/x", UA)).toBe(false);
    expect(isAllowedByRobots(txt, "/other", UA)).toBe(true);
  });

  it("ignores comments, blank lines, case and unknown lines; merges groups of one agent", () => {
    const txt = [
      "# comment",
      "USER-AGENT: *   # trailing comment",
      "disallow: /one",
      "",
      "Crawl-delay: 10",
      "Sitemap: https://example.org/sitemap.xml",
      "User-agent: *",
      "Disallow: /two",
    ].join("\r\n");
    expect(isAllowedByRobots(txt, "/one", UA)).toBe(false);
    expect(isAllowedByRobots(txt, "/two", UA)).toBe(false);
    expect(isAllowedByRobots(txt, "/three", UA)).toBe(true);
  });

  it("handles several user-agent lines in one group", () => {
    const txt = "User-agent: a-bot\nUser-agent: the-bridge-story-discovery\nDisallow: /x\n";
    expect(isAllowedByRobots(txt, "/x", UA)).toBe(false);
    expect(isAllowedByRobots(txt, "/x", "zzz")).toBe(true);
  });

  it("works with a query string and a path that does not start with a slash", () => {
    const txt = "User-agent: *\nDisallow: /search\n";
    expect(isAllowedByRobots(txt, "/search?q=1", UA)).toBe(false);
    expect(isAllowedByRobots(txt, "search", UA)).toBe(false);
  });
});
