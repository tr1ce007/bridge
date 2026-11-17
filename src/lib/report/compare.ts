import type { DiscoveryReport } from "./schema";
import { DIRECTION_CATALOGUE } from "./directions";

export interface ReportDiff {
  /** Directions in the later report that the earlier one did not have (names as in `b`). */
  appeared: string[];
  /** Directions the earlier report had that the later one no longer has (names as in `a`). */
  disappeared: string[];
  /** Directions present in both (names as in `b`). */
  stayed: string[];
  patternsAppeared: string[];
  patternsDisappeared: string[];
  patternsStayed: string[];
}

/** Lower case, letters and digits only (keeps Cyrillic), so "Data and  ML!" equals "data and ml". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const CATALOGUE_BY_LABEL = new Map<string, string>(
  DIRECTION_CATALOGUE.flatMap((d) => Object.values(d.label).map((label) => [normalize(label), d.id] as const)),
);

/** Catalogue id for a direction written as an id or as a label in any language, else undefined. */
export function catalogueIdFor(nameOrId: string): string | undefined {
  const trimmed = nameOrId.trim();
  if (DIRECTION_CATALOGUE.some((d) => d.id === trimmed)) return trimmed;
  return CATALOGUE_BY_LABEL.get(normalize(trimmed));
}

/**
 * Identity of a direction: the catalogue id when the name is a catalogue label in any language
 * (so "Психология" and "Psychology" are the same direction), else the normalised name.
 */
export function directionKey(name: string): string {
  const n = normalize(name);
  return CATALOGUE_BY_LABEL.get(n) ?? n;
}

/** Splits two lists by identity, keeping the order of appearance and dropping repeats. */
function split(from: string[], to: string[], key: (s: string) => string) {
  const fromKeys = new Set(from.map(key));
  const toKeys = new Set(to.map(key));
  const unique = (list: string[], keep: (k: string) => boolean) => {
    const seen = new Set<string>();
    return list.filter((s) => {
      const k = key(s);
      if (!keep(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  return {
    appeared: unique(to, (k) => !fromKeys.has(k)),
    disappeared: unique(from, (k) => !toKeys.has(k)),
    stayed: unique(to, (k) => fromKeys.has(k)),
  };
}

/**
 * What changed between an earlier report `a` and a later report `b`: directions by name and
 * patterns by text. Pure and deterministic; it never scores or ranks anything.
 */
export function compareReports(a: DiscoveryReport, b: DiscoveryReport): ReportDiff {
  const dirs = split(
    a.directions.map((d) => d.name),
    b.directions.map((d) => d.name),
    directionKey,
  );
  const pats = split(a.patterns, b.patterns, normalize);
  return {
    ...dirs,
    patternsAppeared: pats.appeared,
    patternsDisappeared: pats.disappeared,
    patternsStayed: pats.stayed,
  };
}
