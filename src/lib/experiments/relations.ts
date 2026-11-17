import { DIRECTION_CATALOGUE } from "@/lib/report/directions";
import type { Rankable } from "./rank";

/** For one experiment: others in the same direction ("close") and in neighbouring directions ("adjacent"). */
export interface ExperimentRelation {
  close: string[];
  adjacent: string[];
}
export type ExperimentRelations = Record<string, ExperimentRelation>;

/**
 * Which experiments are alike, from the report's direction catalogue (`DIRECTION_CATALOGUE`):
 * - close: another experiment with the same `direction` slug, or listed under the same catalogue direction;
 * - adjacent: an experiment listed under a direction that the catalogue marks as adjacent.
 * Computed on the server (the catalogue is large) and passed to the client island as plain data.
 */
export function buildExperimentRelations(experiments: Rankable[]): ExperimentRelations {
  const known = new Set(experiments.map((e) => e.id));
  const entriesOf = (id: string) => DIRECTION_CATALOGUE.filter((d) => d.experimentIds.includes(id));
  const idsOf = (entryIds: string[]) =>
    DIRECTION_CATALOGUE.filter((d) => entryIds.includes(d.id)).flatMap((d) => d.experimentIds);

  const out: ExperimentRelations = {};
  for (const e of experiments) {
    const entries = entriesOf(e.id);
    const close = new Set<string>(experiments.filter((x) => x.direction === e.direction).map((x) => x.id));
    for (const entry of entries) for (const id of entry.experimentIds) close.add(id);
    close.delete(e.id);
    const adjacent = new Set<string>(idsOf(entries.flatMap((d) => d.adjacent)));
    adjacent.delete(e.id);
    for (const id of close) adjacent.delete(id);
    out[e.id] = {
      close: [...close].filter((id) => known.has(id)),
      adjacent: [...adjacent].filter((id) => known.has(id)),
    };
  }
  return out;
}
