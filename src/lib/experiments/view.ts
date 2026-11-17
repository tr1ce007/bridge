import type { Difficulty, Experiment, Locale } from "@/lib/data/types";
import { localized, localizedList } from "@/lib/localized";

/** An experiment in one language (what the client component needs; keeps the page payload small). */
export interface ExperimentView {
  id: string;
  /** Slug from `DIRECTIONS`. */
  direction: string;
  title: string;
  steps: string[];
  timeEstimate: string;
  difficulty: Difficulty;
  resources: string[];
  outcome: string;
  /** All reflection questions of the experiment; index 0 is the key "process or idea" question. */
  reflection: string[];
}

export function toExperimentView(e: Experiment, locale: Locale): ExperimentView {
  return {
    id: e.id,
    direction: e.direction,
    title: localized(e.title, locale),
    steps: localizedList(e.steps, locale),
    timeEstimate: localized(e.timeEstimate, locale),
    difficulty: e.difficulty,
    resources: localizedList(e.resources, locale),
    outcome: localized(e.outcome, locale),
    reflection: localizedList(e.reflection, locale),
  };
}
