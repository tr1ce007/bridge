import { describe, expect, it } from "vitest";
import { z } from "zod";
import demoStories from "./fixtures/demo-stories.json";
import { storySchema } from "@/lib/data/types";

/** Stable fixture: the former demo stories (the bundled content is now real, documented stories). */
const bundledStories = z.array(storySchema).parse(demoStories);
import { filterStories, hasActiveStoryFilter } from "@/lib/stories/filter";
import { relatedStories } from "@/lib/stories/related";
import { validateSubmission, EMPTY_SUBMISSION } from "@/lib/stories/validate";

const ids = (list: { id: string }[]) => list.map((s) => s.id);

describe("filterStories", () => {
  it("returns everything for an empty query", () => {
    expect(filterStories(bundledStories, {})).toHaveLength(bundledStories.length);
    expect(filterStories(bundledStories, { q: "   " })).toHaveLength(bundledStories.length);
  });

  it("searches text across fields, case-insensitively, in any language", () => {
    expect(ids(filterStories(bundledStories, { q: "ДИЗАЙН" }))).toContain("demo-changed-major");
    expect(ids(filterStories(bundledStories, { q: "dean" }))).toContain("demo-changed-major");
    expect(filterStories(bundledStories, { q: "zzzz-no-such-text" })).toEqual([]);
  });

  it("filters by category", () => {
    const r = filterStories(bundledStories, { category: "changed-major" });
    expect(ids(r)).toEqual(expect.arrayContaining(["demo-changed-major", "demo-pause-and-return"]));
    expect(r.every((s) => s.categories?.includes("changed-major"))).toBe(true);
  });

  it("filters by interest and challenge tags", () => {
    expect(filterStories(bundledStories, { interest: "sport" }).map((s) => s.id)).toEqual(["demo-sports-referee"]);
    const money = filterStories(bundledStories, { challenge: "money" });
    expect(money.length).toBeGreaterThan(0);
    expect(money.every((s) => s.tags.challenges.includes("money"))).toBe(true);
  });

  it("filters by age range; stories without an age never match an age filter", () => {
    expect(ids(filterStories(bundledStories, { ageRange: "35-plus" }))).toEqual(["demo-at-40"]);
    const noAge = { ...bundledStories[0], id: "x", ageRange: undefined };
    expect(filterStories([noAge], { ageRange: "18-24" })).toEqual([]);
  });

  it("filters by kind", () => {
    expect(filterStories(bundledStories, { kind: "demo" })).toHaveLength(bundledStories.length);
    expect(filterStories(bundledStories, { kind: "verified" })).toEqual([]);
  });

  it("combines filters with AND", () => {
    const r = filterStories(bundledStories, { category: "changed-major", ageRange: "18-24", q: "дизайн" });
    expect(ids(r)).toContain("demo-changed-major");
    expect(filterStories(bundledStories, { category: "changed-major", ageRange: "35-plus" })).toEqual([]);
  });

  it("reports whether any filter is active", () => {
    expect(hasActiveStoryFilter({})).toBe(false);
    expect(hasActiveStoryFilter({ q: " " })).toBe(false);
    expect(hasActiveStoryFilter({ kind: "demo" })).toBe(true);
  });
});

describe("relatedStories", () => {
  it("ranks by shared tags, excludes the story itself and stories without overlap", () => {
    const base = bundledStories.find((s) => s.id === "demo-small-town-abroad")!;
    const r = relatedStories(base, bundledStories, 3);
    expect(r.length).toBeLessThanOrEqual(3);
    expect(ids(r)).not.toContain(base.id);
    expect(relatedStories(base, [base], 3)).toEqual([]);
  });
});

describe("validateSubmission", () => {
  const ok = {
    ...EMPTY_SUBMISSION,
    title: "Моя история",
    intro: "Коротко о себе",
    before: "Раньше",
    challenges: "Трудности",
    actions: "Решения",
    turningPoint: "Поворот",
    now: "Сейчас",
    category: "unsure" as const,
    anonymous: true,
    consent: true,
  };
  it("accepts a complete submission", () => {
    expect(validateSubmission(ok)).toEqual({});
  });
  it("flags required, too short and too long fields", () => {
    const e = validateSubmission({ ...ok, title: "ab", before: "", now: "x".repeat(4001), category: "", consent: false });
    expect(e.title).toBe("tooShort");
    expect(e.before).toBe("required");
    expect(e.now).toBe("tooLong");
    expect(e.category).toBe("required");
    expect(e.consent).toBe("required");
  });
  it("needs a display name only when not anonymous", () => {
    expect(validateSubmission({ ...ok, anonymous: false, displayName: "" }).displayName).toBe("required");
    expect(validateSubmission({ ...ok, anonymous: false, displayName: "Айгерим" })).toEqual({});
  });
});

describe("missingSections", () => {
  it("lists sections without text or marked incomplete", async () => {
    const { missingSections } = await import("@/lib/stories/sections");
    const base = bundledStories[0];
    expect(missingSections(base, "ru")).toEqual([]);
    const noAdvice = { ...base, advice: undefined };
    expect(missingSections(noAdvice, "ru")).toEqual(["advice"]);
    const marked = { ...base, incomplete: ["turningPoint", "unknown-field"] };
    expect(missingSections(marked, "en")).toEqual(["turningPoint"]);
    const blank = { ...base, now: { ru: "   " } };
    expect(missingSections(blank, "ru")).toEqual(["now"]);
  });
});
