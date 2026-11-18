import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import {
  bundledExperiments,
  bundledOpportunities,
  bundledStories,
  createLocalContentStore,
} from "@/lib/data/local-content";
import { DIRECTIONS } from "@/lib/data/directions";
import { AXIS_TAGS } from "@/lib/data/tags";
import { AXES, LOCALES, STORY_KINDS } from "@/lib/data/types";

describe("content: stories", () => {
  it("has only real documented stories, each with a source link, date and attribution", () => {
    expect(bundledStories.length).toBeGreaterThanOrEqual(6);
    expect(new Set(bundledStories.map((s) => s.id)).size).toBe(bundledStories.length);
    for (const s of bundledStories) {
      expect(s.kind, s.id).toBe("documented");
      expect(s.sourceUrl?.startsWith("https://"), s.id).toBe(true);
      expect(s.sourceName, s.id).toBeTruthy();
      expect(s.publishedAt, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.attribution.ru, s.id).toContain("Пересказ");
    }
  });

  it("tags every story on all 8 axes using only the closed vocabulary", () => {
    for (const s of bundledStories) {
      for (const axis of AXES) {
        expect(s.tags[axis].length, `${s.id}.${axis}`).toBeGreaterThan(0);
        for (const t of s.tags[axis]) {
          expect(AXIS_TAGS[axis], `${s.id}.${axis}=${t}`).toContain(t);
        }
      }
    }
  });

  it("has every text field in ru, kk and en, and a valid original language", () => {
    for (const s of bundledStories) {
      expect(LOCALES).toContain(s.lang);
      for (const f of ["title", "before", "challenges", "turningPoint", "actions", "now"] as const) {
        for (const l of LOCALES) expect(s[f]?.[l], `${s.id}.${f}.${l}`).toBeTruthy();
      }
      // Advice is shown only when the source gave one; otherwise it is marked as not stated.
      if (s.advice) for (const l of LOCALES) expect(s.advice[l], `${s.id}.advice.${l}`).toBeTruthy();
      else expect(s.incomplete, s.id).toContain("advice");
    }
  });
});

describe("content: experiments", () => {
  it("has 12-16 experiments covering the required directions", () => {
    expect(bundledExperiments.length).toBeGreaterThanOrEqual(12);
    expect(bundledExperiments.length).toBeLessThanOrEqual(16);
    const required = [
      "diplomacy",
      "entrepreneurship",
      "psychology",
      "programming",
      "design",
      "education",
      "media",
      "research",
      "social-impact",
      "medicine",
      "law",
      "engineering",
    ];
    const present = new Set(bundledExperiments.map((e) => e.direction));
    for (const d of required) expect(present.has(d), d).toBe(true);
    for (const e of bundledExperiments) expect(DIRECTIONS).toContain(e.direction);
  });

  it("asks the process-vs-idea reflection question in every experiment", () => {
    for (const e of bundledExperiments) {
      expect(e.reflection.ru).toContain("Тебе понравился сам процесс или только идея этим заниматься?");
      expect(e.reflection.en.length).toBe(e.reflection.ru.length);
      expect(e.reflection.kk.length).toBe(e.reflection.ru.length);
      expect(e.steps.kk.length).toBe(e.steps.ru.length);
      expect(e.steps.en.length).toBe(e.steps.ru.length);
    }
  });
});

describe("content: opportunities", () => {
  it("every bundled entry was checked against its official site and carries the check date", () => {
    for (const o of bundledOpportunities) {
      expect(o.status, o.id).toBe("verified");
      expect(o.verifiedAt, o.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(bundledOpportunities.find((o) => o.id === "bolashak")?.country).toBe("international");
  });

  it("uses official https links only and never an unverified deadline", () => {
    expect(bundledOpportunities.length).toBeGreaterThanOrEqual(8);
    const urls = bundledOpportunities.map((o) => o.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const o of bundledOpportunities) {
      expect(o.url.startsWith("https://")).toBe(true);
      if (o.status !== "verified") {
        expect(o.deadline).toBeNull();
        expect(o.verifiedAt).toBeNull();
      } else {
        expect(o.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      expect(o.eligibility.ru).toMatch(/официальн/);
    }
  });
});

describe("local content store", () => {
  it("filters stories and opportunities", async () => {
    const c = createLocalContentStore();
    expect((await c.listStories()).length).toBe(bundledStories.length);
    const tagged = await c.listStories({ tag: { axis: "transitions", tag: "late-career-change" } });
    expect(tagged.length).toBeGreaterThan(0);
    expect(await c.listStories({ kind: "user" })).toEqual([]);
    expect(await c.getStory("nope")).toBeNull();
    expect((await c.getStory(bundledStories[0].id))?.id).toBe(bundledStories[0].id);
    const courses = await c.listOpportunities({ kind: "course" });
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.every((o) => o.kind === "course")).toBe(true);
    const masters = await c.listOpportunities({ level: "master" });
    expect(masters.some((o) => o.id === "chevening")).toBe(true);
    expect(await c.listExperiments()).toHaveLength(bundledExperiments.length);
  });

  it("locale list matches the router", () => {
    expect([...LOCALES]).toEqual([...routing.locales]);
    expect(STORY_KINDS).toContain("demo");
  });
});
