import { describe, expect, it } from "vitest";
import { bundledExperiments } from "@/lib/data/local-content";
import type { ExperimentCompletion } from "@/lib/data/types";
import { likedExperiments, rankExperiments } from "@/lib/experiments/rank";
import { buildExperimentRelations } from "@/lib/experiments/relations";

const done = (experimentId: string, rating: number, answer: ExperimentCompletion["answer"]): ExperimentCompletion => ({
  experimentId,
  rating,
  enjoyedProcess: answer === "process",
  answer,
  reflection: "",
  completedAt: "2026-11-17T10:00:00.000Z",
});
const order = (r: { experiment: { id: string } }[]) => r.map((x) => x.experiment.id);

describe("rankExperiments", () => {
  const relations = buildExperimentRelations(bundledExperiments);
  const byDir = (d: string) => bundledExperiments.find((e) => e.direction === d)!;

  it("keeps the catalogue order when there is no feedback", () => {
    const r = rankExperiments(bundledExperiments, [], relations);
    expect(order(r)).toEqual(bundledExperiments.map((e) => e.id));
    expect(r.every((x) => !x.completed && !x.similar)).toBe(true);
  });

  it("likedExperiments: only 'the process' with rating >= 4 counts", () => {
    const psych = byDir("psychology");
    const prog = byDir("programming");
    const design = byDir("design");
    const liked = likedExperiments(bundledExperiments, [done(psych.id, 4, "process"), done(prog.id, 5, "idea"), done(design.id, 3, "process")]);
    expect(liked.map((e) => e.id)).toEqual([psych.id]);
  });

  it("legacy completions without `answer` use enjoyedProcess", () => {
    const e = bundledExperiments[0];
    const legacy: ExperimentCompletion = { experimentId: e.id, rating: 5, enjoyedProcess: true, reflection: "", completedAt: "2026-11-17T10:00:00.000Z" };
    expect(likedExperiments(bundledExperiments, [legacy]).map((x) => x.id)).toEqual([e.id]);
  });

  it("builds relations from the report's direction catalogue", () => {
    const psych = byDir("psychology");
    expect(relations[psych.id].adjacent).toEqual(
      expect.arrayContaining([byDir("education").id, byDir("medicine").id, byDir("research").id, byDir("social-impact").id]),
    );
    // experiments listed under the same catalogue direction are close
    expect(relations["exp-diplomacy-memo"].close).toContain("exp-research-mini-survey");
    // never related to itself, and close and adjacent do not overlap
    for (const [id, rel] of Object.entries(relations)) {
      expect(rel.close).not.toContain(id);
      expect(rel.adjacent).not.toContain(id);
      expect(rel.close.filter((x) => rel.adjacent.includes(x))).toEqual([]);
    }
  });

  it("moves experiments near an enjoyed one up (close first, then adjacent) and marks them similar", () => {
    const diplomacy = byDir("diplomacy");
    const r = rankExperiments(bundledExperiments, [done(diplomacy.id, 5, "process")], relations);
    const ids = order(r);
    // close (same catalogue direction "public-policy"): the research mini-survey
    expect(ids[0]).toBe("exp-research-mini-survey");
    expect(r[0]).toMatchObject({ similar: true, similarTo: diplomacy.id, completed: false });
    // adjacent (international-relations -> law, media, social-impact ...) come before unrelated ones
    const firstUnrelated = r.findIndex((x) => !x.similar && !x.completed);
    const lastSimilar = r.map((x) => x.similar).lastIndexOf(true);
    expect(lastSimilar).toBeLessThan(firstUnrelated);
    expect(r.filter((x) => x.similar).length).toBeGreaterThan(1);
    // the completed one goes to the end and is not "similar"
    expect(ids[ids.length - 1]).toBe(diplomacy.id);
    expect(r[r.length - 1]).toMatchObject({ completed: true, similar: false });
  });

  it("same direction counts as close even without relations", () => {
    const sibling = { ...bundledExperiments[0], id: "exp-sibling", direction: bundledExperiments[5].direction };
    const list = [...bundledExperiments, sibling];
    const r = rankExperiments(list, [done(bundledExperiments[5].id, 4, "process")]);
    expect(order(r)[0]).toBe("exp-sibling");
    expect(r[0].similar).toBe(true);
  });

  it("is deterministic and does not mutate its input", () => {
    const copy = [...bundledExperiments];
    const c = [done(bundledExperiments[3].id, 4, "process")];
    expect(order(rankExperiments(bundledExperiments, c, relations))).toEqual(order(rankExperiments(bundledExperiments, c, relations)));
    expect(bundledExperiments).toEqual(copy);
  });

  it("an 'only the idea' or low rating does not boost anything", () => {
    const e = bundledExperiments[5];
    expect(rankExperiments(bundledExperiments, [done(e.id, 5, "idea")], relations).some((x) => x.similar)).toBe(false);
    expect(rankExperiments(bundledExperiments, [done(e.id, 3, "process")], relations).some((x) => x.similar)).toBe(false);
    expect(rankExperiments(bundledExperiments, [done(e.id, 5, "unsure")], relations).some((x) => x.similar)).toBe(false);
  });
});

describe("experiment view and reflection text", () => {
  it("builds a one-language view with ru fallback", async () => {
    const { toExperimentView } = await import("@/lib/experiments/view");
    const e = bundledExperiments[0];
    const v = toExperimentView(e, "en");
    expect(v.title).toBe(e.title.en);
    expect(v.steps).toEqual(e.steps.en);
    expect(v.reflection[0]).toBe(e.reflection.en[0]);
    const ruOnly = { ...e, title: { ru: "Тест", kk: "", en: "" } };
    expect(toExperimentView(ruOnly, "kk").title).toBe("Тест");
  });

  it("composes the reflection from answered questions and the note", async () => {
    const { composeReflection } = await import("@/lib/experiments/reflection");
    expect(composeReflection([{ question: "Q1", answer: " A1 " }, { question: "Q2", answer: "  " }], "", "Note")).toBe("Q1\nA1");
    expect(composeReflection([], " hello ", "Note")).toBe("Note\nhello");
    expect(composeReflection([{ question: "Q1", answer: "A1" }], "n", "Note")).toBe("Q1\nA1\n\nNote\nn");
    expect(composeReflection([], "", "Note")).toBe("");
  });
});
