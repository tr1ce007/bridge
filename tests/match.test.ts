import { describe, expect, it } from "vitest";
import { matchStories } from "@/lib/matching/match";
import { answersToTags } from "@/lib/matching/answer-tags";
import { bundledStories } from "@/lib/data/local-content";
import { AXES, type Answer, type Axis, type Story } from "@/lib/data/types";

function story(id: string, tags: Partial<Record<Axis, string[]>>): Story {
  const t = { ru: id };
  return {
    id,
    kind: "demo",
    lang: "ru",
    title: t,
    attribution: t,
    before: t,
    challenges: t,
    turningPoint: t,
    actions: t,
    now: t,
    tags: Object.fromEntries(AXES.map((a) => [a, tags[a] ?? []])) as Record<Axis, string[]>,
  };
}

// Small town (from the free-text place), scholarship needed, likes tech and science.
const answers: Answer[] = [
  { questionId: "A1", value: "a18_22" },
  { questionId: "A2", value: "school" },
  { questionId: "A3", value: "Казахстан, село под Костанаем" },
  { questionId: "B1", value: ["tech", "science"] },
  { questionId: "E1", value: ["money"] },
  { questionId: "G1", value: ["finance"] },
  { questionId: "G2", value: "needScholarship" },
];

describe("matchStories", () => {
  it("match ranks shared-start story above shared-profession", () => {
    const sameStart = story("same-start", { start: ["small-town", "low-income"], interests: ["creative"] });
    const sameProfession = story("same-profession", { start: ["big-city"], interests: ["tech", "science"] });
    const result = matchStories(answers, [sameProfession, sameStart], 5, "ru");
    expect(result.map((m) => m.story.id)).toEqual(["same-start", "same-profession"]);
  });

  it("relevance is categorical", () => {
    const result = matchStories(answers, bundledStories, 9, "en");
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(["low", "medium", "high"]).toContain(m.relevance);
      expect(typeof m.relevance).toBe("string");
      // Explanations are plain words from tag labels, never percentages.
      for (const line of [...m.why, ...m.differences]) {
        expect(line).not.toMatch(/%|\d+\s*percent/i);
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
    // the story about a small town and money comes first and is at least "medium"
    expect(result[0].story.id).toBe("demo-small-town-abroad");
    expect(result[0].relevance).not.toBe("low");
    expect(result[0].why.length).toBeGreaterThan(0);
  });

  it("returns at most n matches, best first", () => {
    const result = matchStories(answers, bundledStories, 3, "ru");
    expect(result).toHaveLength(3);
  });
});

describe("answersToTags", () => {
  it("maps answers onto the closed tag vocabulary", () => {
    const tags = answersToTags(answers);
    expect(tags.start).toEqual(expect.arrayContaining(["small-town", "low-income"]));
    expect(tags.interests).toEqual(expect.arrayContaining(["tech", "science"]));
    expect(tags.challenges).toContain("money");
    expect(tags.education).toContain("school");
    expect(tags.transitions).toContain("school-to-university");
  });

  it("ignores skipped answers and free-text 'other' entries", () => {
    const tags = answersToTags([
      { questionId: "B1", value: ["other:ловить рыбу"], skipped: false },
      { questionId: "E1", value: [], skipped: true },
    ]);
    expect(tags.interests).toEqual([]);
    expect(tags.fears).toEqual([]);
  });
});
