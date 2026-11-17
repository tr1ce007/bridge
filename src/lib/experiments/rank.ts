import type { ExperimentCompletion } from "@/lib/data/types";
import type { ExperimentRelations } from "./relations";

/** All that ranking needs; both the full `Experiment` and the per-language view fit. */
export interface Rankable {
  id: string;
  direction: string;
}

/** Rating at or above which "I enjoyed the process" counts as a real signal. */
export const LIKE_MIN_RATING = 4;

export interface RankedExperiment<T extends Rankable = Rankable> {
  experiment: T;
  /** The person already did and reflected on it. */
  completed: boolean;
  /** Not done yet, and close to an experiment whose process the person enjoyed (rated >= 4). */
  similar: boolean;
  /** Id of the enjoyed experiment this one is similar to (set when `similar`). */
  similarTo?: string;
}

/** True when the answer was "the process" (older saved completions only have `enjoyedProcess`). */
function enjoyedProcess(c: ExperimentCompletion): boolean {
  return c.answer ? c.answer === "process" : c.enjoyedProcess;
}

/** Experiments (in catalogue order) whose completion was "the process" with rating >= 4. */
export function likedExperiments<T extends Rankable>(experiments: T[], completions: ExperimentCompletion[]): T[] {
  return experiments.filter((e) => {
    const c = completions.find((x) => x.experimentId === e.id);
    return Boolean(c && enjoyedProcess(c) && c.rating >= LIKE_MIN_RATING);
  });
}

/**
 * How feedback changes the order of /try (deterministic, no AI, no scores):
 * 1. Not-yet-done experiments close to one the person enjoyed (same direction, or the same
 *    catalogue direction) come first and are marked `similar`.
 * 2. Then those in neighbouring directions (the catalogue's `adjacent` lists), also `similar`.
 * 3. Then all other open experiments.
 * 4. Completed experiments go last.
 * Inside each group the catalogue order is kept. "Enjoyed" means the answer "the process" with
 * rating >= 4; "only the idea", "not sure" and ratings below 4 never change the order.
 * `relations` comes from `buildExperimentRelations`; without it only the same direction counts.
 * The input array is not modified.
 */
export function rankExperiments<T extends Rankable>(
  experiments: T[],
  completions: ExperimentCompletion[],
  relations: ExperimentRelations = {},
): RankedExperiment<T>[] {
  const doneIds = new Set(completions.map((c) => c.experimentId));
  const liked = likedExperiments(experiments, completions);

  const items = experiments.map((experiment, index) => {
    const completed = doneIds.has(experiment.id);
    let group = completed ? 3 : 2;
    let similarTo: string | undefined;
    if (!completed) {
      for (const l of liked) {
        const rel = relations[l.id];
        if (l.direction === experiment.direction || rel?.close.includes(experiment.id)) {
          group = 0;
          similarTo = l.id;
          break;
        }
        if (group > 1 && rel?.adjacent.includes(experiment.id)) {
          group = 1;
          similarTo = l.id;
        }
      }
    }
    return { experiment, completed, similar: group < 2, similarTo, group, index };
  });
  items.sort((a, b) => a.group - b.group || a.index - b.index);
  return items.map(({ experiment, completed, similar, similarTo }) => ({
    experiment,
    completed,
    similar,
    ...(similarTo ? { similarTo } : {}),
  }));
}
