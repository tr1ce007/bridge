import type { Roadmap } from "@/lib/data/types";

export type QuestionnaireState = "not-started" | "in-progress" | "done";

export interface NextStepsState {
  questionnaire: QuestionnaireState;
  /** The required questionnaire blocks are answered, so a report can be built. */
  canGenerate: boolean;
  reportCount: number;
  /** Roadmap items that are not done, in plan order (7 days, 30 days, 90 days). */
  openRoadmapItems: { id: string; text: string; horizon: keyof Roadmap }[];
  completedExperimentCount: number;
  /** Experiments ranked for this person (`rankExperiments`), open ones only, best first. */
  suggestedExperiments: { id: string; title: string }[];
}

export type NextStep =
  | { kind: "start-questionnaire" }
  | { kind: "continue-questionnaire" }
  | { kind: "generate-report" }
  | { kind: "roadmap-item"; id: string; text: string; horizon: keyof Roadmap }
  | { kind: "try-experiment"; id: string; title: string }
  | { kind: "reflect" };

export const NEXT_ROADMAP_ITEMS = 3;
export const NEXT_EXPERIMENTS = 2;

/**
 * Deterministic "what could I do next" (no AI, no scores):
 * 1. no report yet: start the questionnaire, continue it, or build the report once it can be built;
 * 2. with a report: the next 3 roadmap items that are not done;
 * 3. and, while no experiment has been completed, the top-ranked experiments;
 * 4. when nothing is left, a gentle "reflect" step.
 */
export function nextSteps(state: NextStepsState): NextStep[] {
  if (state.reportCount === 0) {
    if (state.canGenerate) return [{ kind: "generate-report" }];
    return [{ kind: state.questionnaire === "in-progress" ? "continue-questionnaire" : "start-questionnaire" }];
  }
  const steps: NextStep[] = state.openRoadmapItems
    .slice(0, NEXT_ROADMAP_ITEMS)
    .map((i) => ({ kind: "roadmap-item", id: i.id, text: i.text, horizon: i.horizon }));
  if (state.completedExperimentCount === 0) {
    for (const e of state.suggestedExperiments.slice(0, NEXT_EXPERIMENTS)) steps.push({ kind: "try-experiment", id: e.id, title: e.title });
  }
  return steps.length ? steps : [{ kind: "reflect" }];
}
