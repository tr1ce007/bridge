import type { Roadmap, RoadmapItem } from "@/lib/data/types";
import type { WhatIfPeriod, WhatIfScenario } from "./schema";

export type PeriodLabels = Record<WhatIfPeriod, string>;

/**
 * Roadmap lines from a scenario: the first action of weeks 1–4 go to the 30-day plan and the first
 * action of months 2 and 3 to the 90-day plan, each starting with the period label.
 */
export function scenarioRoadmapItems(scenario: WhatIfScenario, labels: PeriodLabels): { d30: string[]; d90: string[] } {
  const line = (p: WhatIfPeriod) => `${labels[p]}: ${scenario.periods[p].actions[0]}`;
  return { d30: (["w1", "w2", "w3", "w4"] as const).map(line), d90: (["m2", "m3"] as const).map(line) };
}

/** Appends the lines (not done) to d30 and d90 without touching d7 or existing items; skips lines already there. */
export function appendScenarioToRoadmap(roadmap: Roadmap, items: { d30: string[]; d90: string[] }, newId: () => string): Roadmap {
  const add = (existing: RoadmapItem[], texts: string[]): RoadmapItem[] => {
    const have = new Set(existing.map((i) => i.text));
    return [...existing, ...texts.filter((t) => !have.has(t)).map((text) => ({ id: newId(), text, done: false }))];
  };
  return { d7: roadmap.d7, d30: add(roadmap.d30, items.d30), d90: add(roadmap.d90, items.d90) };
}
