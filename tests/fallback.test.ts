import { describe, expect, it } from "vitest";
import { buildFallbackReport } from "@/lib/report/fallback";
import { reportSchema } from "@/lib/report/schema";
import { DIRECTION_CATALOGUE } from "@/lib/report/directions";
import { bundledExperiments, bundledStories } from "@/lib/data/local-content";
import { sampleAnswers } from "./helpers/answers";

const DESTINY = /суждено|предназначен|ты рождён|you are meant to|destined|your destiny|сен жаралғансың|тағдырың/i;

describe("buildFallbackReport", () => {
  it("fallback report passes reportSchema with 5–8 directions", () => {
    for (const locale of ["ru", "kk", "en"] as const) {
      const report = buildFallbackReport(sampleAnswers(), locale);
      const parsed = reportSchema.safeParse(report);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
      expect(report.directions.length).toBeGreaterThanOrEqual(5);
      expect(report.directions.length).toBeLessThanOrEqual(8);
      expect(report.demo).toBe(true);
      expect(report.locale).toBe(locale);
    }
  });

  it("is deterministic and follows the answers", () => {
    const fixed = { id: "r1", createdAt: "2026-11-17T00:00:00.000Z" };
    const a = buildFallbackReport(sampleAnswers(), "ru", fixed);
    const b = buildFallbackReport(sampleAnswers(), "ru", fixed);
    expect(a).toEqual(b);

    const techy = buildFallbackReport(sampleAnswers([{ questionId: "B1", value: ["tech", "science"] }]), "en", fixed);
    const caring = buildFallbackReport(sampleAnswers([{ questionId: "B1", value: ["health", "people"] }]), "en", fixed);
    expect(techy.directions[0].name).not.toEqual(caring.directions[0].name);
    const techNames = techy.directions.slice(0, 3).map((d) => d.name);
    expect(techNames).toContain("Programming and technology");
  });

  it("fills every section and keeps to the catalogue, experiments and stories", () => {
    const report = buildFallbackReport(sampleAnswers(), "ru");
    expect(report.startingPoint.length).toBeGreaterThan(20);
    expect(report.patterns.length).toBeGreaterThan(0);
    expect(report.unnoticed.length).toBeGreaterThan(0);
    expect(report.unexpected.length).toBeGreaterThanOrEqual(1);
    expect(report.unexpected.length).toBeLessThanOrEqual(2);
    expect(report.experiments.length).toBeGreaterThan(0);
    expect(report.roadmap.d7.length).toBeGreaterThan(0);
    expect(report.roadmap.d30.length).toBeGreaterThan(0);
    expect(report.roadmap.d90.length).toBeGreaterThan(0);

    const names = new Set(DIRECTION_CATALOGUE.map((d) => d.label.ru));
    for (const d of report.directions) {
      expect(names.has(d.name)).toBe(true);
      expect(d.howToTest.length).toBeGreaterThan(0);
      expect(d.realityCheck.activities.length).toBeGreaterThan(0);
    }
    // unexpected directions are not repeats of the main list
    for (const u of report.unexpected) expect(report.directions.map((d) => d.name)).not.toContain(u.name);

    const expIds = new Set(bundledExperiments.map((e) => e.id));
    for (const e of report.experiments) if (e.experimentId) expect(expIds.has(e.experimentId)).toBe(true);
    const storyIds = new Set(bundledStories.map((s) => s.id));
    for (const s of report.stories) expect(storyIds.has(s.storyId)).toBe(true);
  });

  it("never uses destiny language", () => {
    for (const locale of ["ru", "kk", "en"] as const) {
      const text = JSON.stringify(buildFallbackReport(sampleAnswers(), locale));
      expect(text).not.toMatch(DESTINY);
    }
    expect(JSON.stringify(DIRECTION_CATALOGUE)).not.toMatch(DESTINY);
  });

  it("every catalogue entry is complete in three languages and links real experiments", () => {
    const expIds = new Set(bundledExperiments.map((e) => e.id));
    expect(DIRECTION_CATALOGUE.length).toBeGreaterThanOrEqual(14);
    for (const d of DIRECTION_CATALOGUE) {
      for (const l of ["ru", "kk", "en"] as const) {
        expect(d.label[l].length, `${d.id} label ${l}`).toBeGreaterThan(0);
        expect(d.why[l].length, `${d.id} why ${l}`).toBeGreaterThan(0);
        for (const list of [d.difficulties, d.skills, d.howToTest, d.realityCheck.activities, d.realityCheck.misconceptions, d.realityCheck.entryRoutes]) {
          expect(list[l].length, `${d.id} list ${l}`).toBeGreaterThan(0);
        }
      }
      for (const id of d.experimentIds) expect(expIds.has(id), `${d.id} -> ${id}`).toBe(true);
      for (const id of d.adjacent) expect(DIRECTION_CATALOGUE.some((x) => x.id === id), `${d.id} adjacent ${id}`).toBe(true);
    }
  });
});
