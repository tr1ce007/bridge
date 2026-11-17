import { bundledExperiments } from "@/lib/data/local-content";
import type { Locale } from "@/lib/data/types";
import { catalogueIdFor } from "@/lib/report/compare";
import { getDirection } from "@/lib/report/directions";
import { SCENARIO_COPY as C, fill } from "./fallback-copy";
import { whatIfSchema, type WhatIfScenario } from "./schema";

/** What a report said about a direction that is not in the catalogue (strings already in the report's language). */
export interface CustomDirection {
  name?: string;
  howToTest?: string[];
  skills?: string[];
  difficulties?: string[];
}

/** "Приём пациентов" -> "приём пациентов" for use after a colon; acronyms like "ML" and "ИИ" stay as they are. */
export function lowerFirst(text: string): string {
  const [first = "", second = ""] = text;
  return second && second === second.toLowerCase() && second !== second.toUpperCase() ? first.toLowerCase() + text.slice(1) : text;
}

/** Longest piece of report text put into a scenario line (a line is at most 700 characters in `whatIfSchema`). */
const MAX_PIECE = 300;
const clean = (list: string[] | undefined) =>
  (list ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.length > MAX_PIECE ? s.slice(0, MAX_PIECE).trimEnd() : s));

function experimentLine(id: string, locale: Locale): string | undefined {
  const e = bundledExperiments.find((x) => x.id === id);
  return e ? `${e.title[locale]} (${e.timeEstimate[locale]})` : undefined;
}

/**
 * Rule-based 3-month exploration scenario, used in demo mode and when the AI fails.
 * `directionKey` is a catalogue id or a direction name in any language. It is built from the
 * catalogue's howToTest, skills, difficulties, entry routes and experiments; for a direction that
 * is not in the catalogue, `custom` (taken from the report) or generic wording is used.
 * It is a plan to explore, never a forecast, and it states no numbers or facts of its own.
 */
export function buildFallbackScenario(directionKey: string, locale: Locale, custom: CustomDirection = {}): WhatIfScenario {
  const id = catalogueIdFor(directionKey);
  const entry = id ? getDirection(id) : undefined;

  const name = entry?.label[locale] ?? (custom.name?.trim() || directionKey.trim());
  const tests = clean(entry ? entry.howToTest[locale] : custom.howToTest);
  const skills = clean(entry ? entry.skills[locale] : custom.skills);
  const difficulties = clean(entry ? entry.difficulties[locale] : custom.difficulties);
  const activities = entry ? clean(entry.realityCheck.activities[locale]) : [];
  const routes = entry ? clean(entry.realityCheck.entryRoutes[locale]) : [];

  const own = (entry?.experimentIds ?? []).flatMap((x) => experimentLine(x, locale) ?? []);
  const neighbour = (entry?.adjacent ?? []).flatMap((adj) => {
    const first = getDirection(adj)?.experimentIds[0];
    return first ? experimentLine(first, locale) ?? [] : [];
  })[0];

  /** Name of the i-th own experiment (without the time estimate), else the first test, else a generic one. */
  const titleOf = (i: number) =>
    (entry?.experimentIds ?? []).flatMap((x) => bundledExperiments.find((e) => e.id === x)?.title[locale] ?? [])[i] ?? tests[0] ?? C.genericTest[locale];

  const test0 = tests[0] ?? C.genericTest[locale];
  const skill0 = lowerFirst(skills[0] ?? C.genericSkill[locale]);

  const scenario: WhatIfScenario = {
    direction: name,
    periods: {
      w1: {
        actions: [fill(C.w1Learn[locale], { activity: lowerFirst(activities[0] ?? C.genericActivity[locale]) }), C.w1Read[locale]],
        experiments: [fill(C.w1Preview[locale], { title: titleOf(0) })],
        people: [C.w1Person[locale]],
        obstacles: [difficulties[0] ?? C.genericDifficulty[locale]],
        checkpoint: C.w1Checkpoint[locale],
      },
      w2: {
        actions: [fill(C.w2Test[locale], { test: test0 })],
        experiments: own.length ? own.slice(0, 1) : [C.genericTest[locale]],
        people: [C.w2Friend[locale]],
        obstacles: [C.w2Time[locale]],
        checkpoint: C.w2Checkpoint[locale],
      },
      w3: {
        actions: [fill(C.w3Practice[locale], { skill: skill0 }), tests[1] ?? C.w3Repeat[locale]],
        experiments: own.length > 1 ? own.slice(1, 2) : [C.w3Repeat[locale]],
        people: [fill(C.w3Person[locale], { skill: skill0 })],
        obstacles: [C.w3Dip[locale]],
        checkpoint: C.w3Checkpoint[locale],
      },
      w4: {
        actions: [C.w4Journal[locale], C.w4Questions[locale]],
        experiments: [fill(C.w4Review[locale], { title: titleOf(0) })],
        people: [C.w4Person[locale], C.w4Recent[locale]],
        obstacles: [C.w4Awkward[locale]],
        checkpoint: C.w4Checkpoint[locale],
      },
      m2: {
        actions: [fill(C.m2Task[locale], { skills: skills.slice(0, 2).map(lowerFirst).join(", ") || skill0 })],
        experiments: own.length > 1 ? own.slice(1, 2) : [C.m2Repeat[locale]],
        people: [C.m2Mentor[locale]],
        obstacles: [difficulties[1] ?? C.m2Hard[locale]],
        checkpoint: C.m2Checkpoint[locale],
      },
      m3: {
        actions: [fill(C.m3Route[locale], { route: lowerFirst(routes[0] ?? C.genericRoute[locale]) }), C.m3Compare[locale]],
        experiments: [neighbour ? fill(C.m3Neighbour[locale], { title: neighbour }) : C.m3NoNeighbour[locale]],
        people: [C.m3Person[locale]],
        obstacles: [C.m3Fear[locale]],
        checkpoint: C.m3Checkpoint[locale],
      },
    },
  };
  return whatIfSchema.parse(scenario);
}
