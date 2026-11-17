import type { DiscoveryReport, Locale } from "@/lib/data/types";
import { catalogueIdFor, directionKey } from "@/lib/report/compare";
import { DIRECTION_CATALOGUE } from "@/lib/report/directions";
import { directionSavedId } from "@/lib/dashboard/saved-directions";

/** The input limits of POST /api/ai/what-if (src/lib/ai/handlers/whatif.ts). Keep them in step. */
export const WHATIF_LIMITS = { name: 160, why: 800, listItems: 8, listItemChars: 400 } as const;

const cut = (text: string, max: number) => (text.length > max ? text.slice(0, max).trimEnd() : text);
const cutList = (list: string[]) => list.slice(0, WHATIF_LIMITS.listItems).map((x) => cut(x, WHATIF_LIMITS.listItemChars));

export interface DirectionOption {
  /** For report directions the same id as a saved direction (`<report id>:<index>`); for the catalogue, the catalogue id. */
  id: string;
  name: string;
  /** Catalogue id when the direction is in the catalogue. */
  key?: string;
  source: "report" | "catalogue";
  why?: string;
  howToTest?: string[];
  skills?: string[];
  difficulties?: string[];
}

/**
 * Directions the person can explore in "What if I try?": the directions of their reports (newest
 * report first, repeated names dropped), or the whole catalogue when there is no report yet.
 * `reports` is newest first.
 */
export function buildDirectionOptions(reports: DiscoveryReport[], locale: Locale): DirectionOption[] {
  if (reports.length === 0) {
    return DIRECTION_CATALOGUE.map((d) => ({ id: d.id, key: d.id, name: d.label[locale], source: "catalogue" as const }));
  }
  const seen = new Set<string>();
  const out: DirectionOption[] = [];
  for (const report of reports) {
    report.directions.forEach((d, index) => {
      const identity = directionKey(d.name);
      if (seen.has(identity)) return;
      seen.add(identity);
      out.push({
        id: directionSavedId(report.id, index),
        name: cut(d.name.trim(), WHATIF_LIMITS.name),
        key: catalogueIdFor(d.name),
        source: "report",
        why: cut(d.why, WHATIF_LIMITS.why),
        howToTest: cutList(d.howToTest),
        skills: cutList(d.skills),
        difficulties: cutList(d.difficulties),
      });
    });
  }
  return out;
}
