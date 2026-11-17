import { describe, expect, it } from "vitest";
import { DIRECTION_CATALOGUE } from "@/lib/report/directions";
import { LOCALES } from "@/lib/data/types";
import { buildFallbackScenario, lowerFirst } from "@/lib/whatif/fallback";
import { appendScenarioToRoadmap, scenarioRoadmapItems } from "@/lib/whatif/roadmap";
import { WHATIF_PERIODS, whatIfSchema } from "@/lib/whatif/schema";

describe("buildFallbackScenario", () => {
  it("passes whatIfSchema for every catalogue direction in every language", () => {
    for (const entry of DIRECTION_CATALOGUE) {
      for (const locale of LOCALES) {
        const scenario = buildFallbackScenario(entry.id, locale);
        const parsed = whatIfSchema.safeParse(scenario);
        expect(parsed.success, `${entry.id}/${locale}`).toBe(true);
        expect(scenario.direction).toBe(entry.label[locale]);
      }
    }
  });

  it("covers weeks 1 to 4 and months 2 and 3, each with a checkpoint question", () => {
    const scenario = buildFallbackScenario("psychology", "en");
    expect(WHATIF_PERIODS).toEqual(["w1", "w2", "w3", "w4", "m2", "m3"]);
    for (const p of WHATIF_PERIODS) {
      expect(scenario.periods[p].actions.length).toBeGreaterThan(0);
      expect(scenario.periods[p].checkpoint).toMatch(/\?$/);
    }
  });

  it("is built from the catalogue's howToTest, skills and experiments", () => {
    const entry = DIRECTION_CATALOGUE.find((d) => d.id === "psychology")!;
    const scenario = buildFallbackScenario("psychology", "en");
    const text = JSON.stringify(scenario);
    expect(text).toContain(entry.howToTest.en[0]);
    expect(text.toLowerCase()).toContain(entry.skills.en[0].toLowerCase());
    expect(scenario.periods.w2.experiments.length + scenario.periods.w3.experiments.length).toBeGreaterThan(0);
  });

  it("accepts a catalogue label in any language and resolves it", () => {
    const entry = DIRECTION_CATALOGUE.find((d) => d.id === "law")!;
    expect(buildFallbackScenario(entry.label.ru, "en").direction).toBe(entry.label.en);
  });

  it("builds a generic scenario for a direction that is not in the catalogue, using what the report said", () => {
    const scenario = buildFallbackScenario("Звукорежиссура", "ru", { howToTest: ["Записать один подкаст"], skills: ["Работа со звуком"], difficulties: ["Нужна техника"] });
    expect(whatIfSchema.safeParse(scenario).success).toBe(true);
    expect(scenario.direction).toBe("Звукорежиссура");
    expect(JSON.stringify(scenario)).toContain("Записать один подкаст");
  });

  it("never promises outcomes or states invented facts", () => {
    for (const locale of LOCALES) {
      const text = JSON.stringify(buildFallbackScenario("data-ml", locale)).toLowerCase();
      expect(text).not.toMatch(/суждено|тағдыр|destiny|guarantee|гарантир/);
      expect(text).not.toMatch(/\d+\s?%/);
    }
  });
});

describe("lowerFirst", () => {
  it("lowers an ordinary capital but keeps acronyms and one-letter words", () => {
    expect(lowerFirst("Приём пациентов")).toBe("приём пациентов");
    expect(lowerFirst("Analytical writing")).toBe("analytical writing");
    expect(lowerFirst("ML and statistics")).toBe("ML and statistics");
    expect(lowerFirst("ИИ в науке")).toBe("ИИ в науке");
    expect(lowerFirst("")).toBe("");
    expect(lowerFirst("А")).toBe("А");
  });
});

describe("scenario to roadmap", () => {
  const scenario = buildFallbackScenario("design", "en");
  const labels = { w1: "Week 1", w2: "Week 2", w3: "Week 3", w4: "Week 4", m2: "Month 2", m3: "Month 3" };

  it("puts weeks 1-4 into the 30-day plan and months 2-3 into the 90-day plan", () => {
    const items = scenarioRoadmapItems(scenario, labels);
    expect(items.d30).toHaveLength(4);
    expect(items.d90).toHaveLength(2);
    expect(items.d30[0]).toBe(`Week 1: ${scenario.periods.w1.actions[0]}`);
    expect(items.d90[1]).toBe(`Month 3: ${scenario.periods.m3.actions[0]}`);
  });

  it("appends to the end of d30 and d90, leaves d7 and existing items alone, and gives new ids", () => {
    const existing = { d7: [{ id: "a", text: "x", done: true }], d30: [{ id: "b", text: "y", done: false }], d90: [] };
    let n = 0;
    const next = appendScenarioToRoadmap(existing, scenarioRoadmapItems(scenario, labels), () => `new-${(n += 1)}`);
    expect(next.d7).toEqual(existing.d7);
    expect(next.d30[0]).toEqual(existing.d30[0]);
    expect(next.d30).toHaveLength(5);
    expect(next.d90).toHaveLength(2);
    expect(new Set([...next.d7, ...next.d30, ...next.d90].map((i) => i.id)).size).toBe(8);
    expect(next.d30.slice(1).every((i) => i.done === false)).toBe(true);
    expect(existing.d30).toHaveLength(1); // input not mutated
  });

  it("does not add the same scenario twice", () => {
    const items = scenarioRoadmapItems(scenario, labels);
    let n = 0;
    const id = () => `n-${(n += 1)}`;
    const once = appendScenarioToRoadmap({ d7: [], d30: [], d90: [] }, items, id);
    const twice = appendScenarioToRoadmap(once, items, id);
    expect(twice.d30).toHaveLength(4);
    expect(twice.d90).toHaveLength(2);
  });
});
