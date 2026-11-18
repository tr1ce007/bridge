import { describe, expect, it } from "vitest";
import { EXCERPT_MAX, toDraft, detectLang } from "@/lib/discovery/draft";
import { toStoryRow } from "@/lib/discovery/insert";
import { storyFromRow } from "@/lib/data/supabase-store";
import type { DiscoveredItem, StoryDraft } from "@/lib/discovery/types";

type StoryRow = Parameters<typeof storyFromRow>[0];

const item = (over: Partial<DiscoveredItem> = {}): DiscoveredItem => ({
  origin: "reddit",
  sourceUrl: "https://www.reddit.com/r/x/comments/1/a/",
  sourceName: "Reddit r/x",
  author: "some_student",
  publishedAt: "2025-01-02",
  title: "I changed my major",
  text: "I changed my major in year three. It was hard.",
  ...over,
});

describe("toDraft", () => {
  it("is always documented and pending", () => {
    const d = toDraft(item());
    expect(d.kind).toBe("documented");
    expect(d.status).toBe("pending");
  });

  it("keeps source, name, date and uses the public handle for attribution", () => {
    const d = toDraft(item());
    expect(d).toMatchObject({
      sourceUrl: "https://www.reddit.com/r/x/comments/1/a/",
      sourceName: "Reddit r/x",
      publishedAt: "2025-01-02",
      attribution: "u/some_student",
      excerpt: "I changed my major in year three. It was hard.",
    });
  });

  it("falls back to anonymous when there is no handle", () => {
    expect(toDraft(item({ author: null })).attribution).toBe("anonymous");
    expect(toDraft(item({ origin: "rss", author: "Aigerim S." })).attribution).toBe("Aigerim S.");
  });

  it("caps the excerpt at 500 characters, on a word boundary, with an ellipsis", () => {
    const long = "word ".repeat(400);
    const d = toDraft(item({ text: long }));
    expect(d.excerpt.length).toBeLessThanOrEqual(EXCERPT_MAX);
    expect(EXCERPT_MAX).toBe(500);
    expect(d.excerpt.endsWith("…")).toBe(true);
    expect(d.excerpt).not.toMatch(/\s…$/);
  });

  it("does not add an ellipsis to short text and collapses whitespace", () => {
    expect(toDraft(item({ text: "a   b\n\n c" })).excerpt).toBe("a b c");
  });

  it("marks every structured field as incomplete until something is extracted", () => {
    const d = toDraft(item());
    expect(d.incomplete).toEqual(["previousSituation", "challenges", "turningPoint", "actions", "now"]);
    expect(d.fields).toEqual({});
    expect(d.tags).toEqual({});
  });

  it("detects the language of the text", () => {
    expect(detectLang("I changed my major")).toBe("en");
    expect(detectLang("Я сменил профессию в тридцать лет")).toBe("ru");
    expect(detectLang("Мен мамандығымды ауыстырдым, өйткені қызықты емес еді")).toBe("kk");
    expect(toDraft(item({ text: "Я сменил профессию", title: "Сменил" })).lang).toBe("ru");
  });

  it("omits an unknown publication date", () => {
    const d = toDraft(item({ publishedAt: undefined }));
    expect("publishedAt" in d).toBe(false);
  });
});

describe("toStoryRow", () => {
  it("builds a pending documented row that the app can read back", () => {
    const d = toDraft(item());
    const row = toStoryRow(d);
    expect(row).toMatchObject({
      kind: "documented",
      status: "pending",
      lang: "en",
      author_id: null,
      source_url: "https://www.reddit.com/r/x/comments/1/a/",
      source_name: "Reddit r/x",
      published_at: "2025-01-02",
    });
    expect(row.id).toMatch(/^disc-[0-9a-f]{16}$/);
    expect(toStoryRow(d).id).toBe(row.id); // same source -> same id, so a re-run cannot duplicate it
    const story = storyFromRow({ ...row, status: "pending" } as unknown as StoryRow);
    expect(story).not.toBeNull();
    expect(story?.incomplete).toEqual(["before", "challenges", "turningPoint", "actions", "now"]);
    expect(story?.attribution).toEqual({ en: "u/some_student" });
  });

  it("uses extracted fields and lists only the missing ones as incomplete", () => {
    const d: StoryDraft = { ...toDraft(item()), fields: { previousSituation: "Studied law.", now: "Works as an analyst." }, incomplete: ["challenges", "turningPoint", "actions"], tags: { interests: ["tech"] } };
    const row = toStoryRow(d);
    expect(row.content).toMatchObject({ before: { en: "Studied law." }, now: { en: "Works as an analyst." }, intro: { en: "I changed my major in year three. It was hard." } });
    expect(row.incomplete).toEqual(["challenges", "turningPoint", "actions"]);
    expect(row.tags.interests).toEqual(["tech"]);
    expect(row.tags.start).toEqual([]);
    expect(storyFromRow({ ...row, status: "pending" } as unknown as StoryRow)).not.toBeNull();
  });

  it("gives anonymous drafts a readable attribution in all languages", () => {
    const row = toStoryRow(toDraft(item({ author: null })));
    expect(row.attribution).toEqual({ ru: "Аноним", kk: "Аноним", en: "Anonymous" });
  });
});
