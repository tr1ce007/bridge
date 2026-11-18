import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRedditListing } from "@/lib/discovery/reddit";
import { parseFeed } from "@/lib/discovery/feed";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/discovery/${name}`, import.meta.url), "utf8");

describe("parseRedditListing", () => {
  const items = parseRedditListing(JSON.parse(fixture("reddit-listing.json")));

  it("keeps only real text posts that are safe to use", () => {
    expect(items.map((i) => i.sourceUrl)).toEqual([
      "https://www.reddit.com/r/careerguidance/comments/abc123/i_changed_my_major_in_year_3/",
      "https://www.reddit.com/r/careerguidance/comments/del001/career_change_at_35/",
    ]);
  });

  it("fills the fields of a post", () => {
    const [first] = items;
    expect(first.origin).toBe("reddit");
    expect(first.sourceName).toBe("Reddit r/careerguidance");
    expect(first.author).toBe("some_student");
    expect(first.publishedAt).toBe("2024-11-17");
    expect(first.title).toBe("I changed my major in year 3 and it was the best decision");
    expect(first.text).toContain("my parents wanted it");
    expect(first.text).toContain("analyst & I like it"); // HTML entities decoded
  });

  it("treats a deleted author as unknown", () => {
    expect(items[1].author).toBeNull();
  });

  it("does not throw on garbage", () => {
    expect(parseRedditListing(null)).toEqual([]);
    expect(parseRedditListing("x")).toEqual([]);
    expect(parseRedditListing({ data: { children: "no" } })).toEqual([]);
    expect(parseRedditListing({})).toEqual([]);
  });
});

describe("parseFeed", () => {
  it("reads RSS 2.0 items and skips items without a safe link", () => {
    const items = parseFeed(fixture("feed-rss.xml"), { name: "Example Stories Blog" });
    expect(items.map((i) => i.sourceUrl)).toEqual([
      "https://blog.example.org/from-medicine-to-design",
      "https://blog.example.org/anon",
    ]);
    const [a, b] = items;
    expect(a).toMatchObject({
      origin: "rss",
      sourceName: "Example Stories Blog",
      author: "Aigerim S.",
      publishedAt: "2025-11-10",
      title: "From medicine to design: my path",
    });
    expect(a.text).toBe("I studied medicine for three years & then left. Design felt like home.");
    // an e-mail address is never used as a public handle
    expect(b.author).toBeNull();
    expect(b.publishedAt).toBeUndefined();
  });

  it("reads Atom entries, picks the alternate link and the published date", () => {
    const items = parseFeed(fixture("feed-atom.xml"), { name: "Atom" });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      sourceUrl: "https://atom.example.org/posts/1",
      author: "Марат",
      publishedAt: "2025-10-01",
      title: "Сменил профессию в 30 лет",
    });
    expect(items[0].text).toBe("Раньше я работал бухгалтером. Потом начал учить программирование.");
    expect(items[1]).toMatchObject({ sourceUrl: "https://atom.example.org/posts/2", publishedAt: "2025-09-15" });
  });

  it("refuses documents with a DOCTYPE or entity declarations", () => {
    expect(parseFeed(fixture("feed-evil.xml"), { name: "x" })).toEqual([]);
  });

  it("returns nothing for broken or unrelated XML", () => {
    expect(parseFeed("<<<not xml", { name: "x" })).toEqual([]);
    expect(parseFeed("", { name: "x" })).toEqual([]);
    expect(parseFeed("<html><body>hi</body></html>", { name: "x" })).toEqual([]);
  });

  it("refuses very large documents", () => {
    expect(parseFeed("<rss>" + "a".repeat(3_000_000) + "</rss>", { name: "x" })).toEqual([]);
  });
});
