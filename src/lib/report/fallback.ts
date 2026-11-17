import { bundledExperiments, bundledStories } from "@/lib/data/local-content";
import type { Answer, Experiment, Locale, Story } from "@/lib/data/types";
import { pickText } from "@/lib/data/content-utils";
import { chosen } from "@/lib/questionnaire/bank";
import { answerTagEntries, scaleValue, splitTag, type AnswerTag, type TagRef } from "@/lib/matching/answer-tags";
import { matchStories } from "@/lib/matching/match";
import { tagLabel } from "@/lib/matching/tag-labels";
import { describeChoice, optionLabel } from "./answer-labels";
import { DIRECTION_CATALOGUE, getDirection, type DirectionEntry, type ScaleId } from "./directions";
import { FALLBACK_COPY as C, fill } from "./fallback-copy";
import type { DiscoveryReport, RoadmapItem } from "./schema";

export interface FallbackOptions {
  id?: string;
  createdAt?: string;
  /** Stories to match against (defaults to the bundled ones). */
  stories?: Story[];
  experiments?: Experiment[];
}

const MIN_DIRECTIONS = 5;
const MAX_MAIN_DIRECTIONS = 7;

interface Ranked {
  entry: DirectionEntry;
  score: number;
  /** Matching answer tags, strongest first. */
  hits: AnswerTag[];
}

/** Scale leanings: answer 1–2 = "low", 4–5 = "high". Matching leaning +1, opposite −0.5. */
function scaleBonus(entry: DirectionEntry, answers: Answer[]): number {
  let bonus = 0;
  for (const [id, want] of Object.entries(entry.scales ?? {}) as [ScaleId, "low" | "high"][]) {
    const v = scaleValue(answers, id);
    if (v === null || v === 3) continue;
    const side = v <= 2 ? "low" : "high";
    bonus += side === want ? 1 : -0.5;
  }
  return bonus;
}

export function rankDirections(answers: Answer[]): Ranked[] {
  const entries = answerTagEntries(answers);
  return DIRECTION_CATALOGUE.map((entry, index) => {
    const hits = entries
      .filter((e) => (entry.affinity[e.tag] ?? 0) > 0)
      .sort((a, b) => (entry.affinity[b.tag] ?? 0) - (entry.affinity[a.tag] ?? 0));
    const score = hits.reduce((s, h) => s + (entry.affinity[h.tag] ?? 0), 0) + scaleBonus(entry, answers);
    return { entry, score, hits, index };
  })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ entry, score, hits }) => ({ entry, score, hits }));
}

let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

function join(items: string[], locale: Locale): string {
  return items.join(C.listJoin[locale]);
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLocaleLowerCase() + s.slice(1) : s;
}

/**
 * Rule-based Discovery Report: same answer→tag mapping as story matching, directions ranked by
 * tag affinity from the catalogue, 1–2 adjacent "unexpected" ones, roadmap from experiments.
 * Deterministic for the same answers and options (pass `id` / `createdAt` to fix those too).
 */
export function buildFallbackReport(answers: Answer[], locale: Locale, options: FallbackOptions = {}): DiscoveryReport {
  const stories = options.stories ?? bundledStories;
  const experiments = options.experiments ?? bundledExperiments;
  const expById = new Map(experiments.map((e) => [e.id, e]));
  const label = (ref: TagRef) => {
    const { axis, tag } = splitTag(ref);
    return tagLabel(axis, tag, locale);
  };

  // ---- directions
  const ranked = rankDirections(answers);
  const positive = ranked.filter((r) => r.score > 0).length;
  const mainCount = Math.min(MAX_MAIN_DIRECTIONS, Math.max(MIN_DIRECTIONS, positive));
  const main = ranked.slice(0, mainCount);
  const mainIds = new Set(main.map((r) => r.entry.id));

  const directions = main.map(({ entry, hits }) => {
    const reasons = hits.slice(0, 3).map((h) => label(h.tag));
    const supporting = [...new Set(hits.map((h) => describeChoice(locale, answerOf(answers, h.questionId))).filter(Boolean) as string[])].slice(0, 3);
    const tests = entry.experimentIds
      .map((id) => expById.get(id))
      .filter((e): e is Experiment => Boolean(e))
      .slice(0, 1)
      .map((e) => fill(C.testExperiment[locale], { title: e.title[locale], time: e.timeEstimate[locale] }));
    return {
      name: entry.label[locale],
      why: fill(entry.why[locale], { reasons: reasons.length ? join(reasons, locale) : C.whyFallbackReasons[locale] }),
      supportingAnswers: supporting,
      difficulties: [...entry.difficulties[locale]],
      skills: [...entry.skills[locale]],
      howToTest: [...tests, ...entry.howToTest[locale]],
      realityCheck: {
        activities: [...entry.realityCheck.activities[locale]],
        misconceptions: [...entry.realityCheck.misconceptions[locale]],
        entryRoutes: [...entry.realityCheck.entryRoutes[locale]],
      },
    };
  });

  // ---- unexpected: adjacent to the top three, but with the lowest affinity among them
  const scoreOf = new Map(ranked.map((r) => [r.entry.id, r.score]));
  const candidates: { id: string; near: DirectionEntry }[] = [];
  for (const r of main.slice(0, 3)) {
    for (const id of r.entry.adjacent) {
      if (!mainIds.has(id) && !candidates.some((c) => c.id === id)) candidates.push({ id, near: r.entry });
    }
  }
  if (candidates.length < 2) {
    for (const r of [...ranked].reverse()) {
      if (!mainIds.has(r.entry.id) && !candidates.some((c) => c.id === r.entry.id)) candidates.push({ id: r.entry.id, near: main[0].entry });
      if (candidates.length >= 2) break;
    }
  }
  const unexpected = candidates
    .map((c, i) => ({ ...c, i, score: scoreOf.get(c.id) ?? 0 }))
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .slice(0, 2)
    .map((c) => ({
      name: getDirection(c.id)!.label[locale],
      why: fill(C.unexpectedWhy[locale], { near: c.near.label[locale] }),
    }));

  // ---- stories
  const matches = matchStories(answers, stories, 3, locale);

  // ---- experiments (one per direction, in rank order, unique)
  const picked: Experiment[] = [];
  for (const r of main) {
    const e = r.entry.experimentIds.map((id) => expById.get(id)).find((x) => x && !picked.includes(x));
    if (e) picked.push(e);
    if (picked.length >= 4) break;
  }

  // ---- roadmap (item ids derive from the report id, so the same options give the same report)
  const reportId = options.id ?? newId("report");
  let n = 0;
  const item = (text: string): RoadmapItem => ({ id: `${reportId}-rm${(n += 1)}`, text, done: false });
  const d7: RoadmapItem[] = [];
  const d30: RoadmapItem[] = [];
  const d90: RoadmapItem[] = [];
  if (picked[0]) d7.push(item(fill(C.d7Experiment[locale], { title: picked[0].title[locale], time: picked[0].timeEstimate[locale] })));
  d7.push(item(C.d7Reflect[locale]));
  if (matches[0]) d7.push(item(fill(C.d7Story[locale], { title: pickText(matches[0].story.title, locale, matches[0].story.lang) })));
  for (const e of picked.slice(1, 3)) d30.push(item(fill(C.d30Experiment[locale], { title: e.title[locale] })));
  d30.push(item(fill(C.d30Talk[locale], { direction: main[0].entry.label[locale] })));
  d30.push(item(C.d30Compare[locale]));
  d90.push(item(C.d90Deepen[locale]));
  const tags = new Set(answerTagEntries(answers).map((e) => e.tag));
  if (tags.has("challenges:money") || tags.has("start:low-income") || tags.has("challenges:language")) {
    d90.push(item(C.d90Opportunities[locale]));
  }
  d90.push(item(C.d90Repeat[locale]));

  return {
    id: reportId,
    createdAt: options.createdAt ?? new Date().toISOString(),
    locale,
    demo: true,
    startingPoint: startingPoint(answers, locale),
    patterns: patterns(answers, locale),
    unnoticed: unnoticed(answers, locale, tags),
    directions,
    stories: matches.map((m) => ({ storyId: m.story.id, relevance: m.relevance, why: m.why, differences: m.differences })),
    unexpected,
    experiments: picked.map((e) => ({ title: e.title[locale], description: e.outcome[locale], experimentId: e.id })),
    roadmap: { d7, d30, d90 },
  };
}

function answerOf(answers: Answer[], id: string): Answer {
  return answers.find((a) => a.questionId === id) ?? { questionId: id, value: "", skipped: true };
}

function labels(answers: Answer[], id: string, locale: Locale, max = 5): string[] {
  return chosen(answers, id)
    .slice(0, max)
    .map((v) => lowerFirst(optionLabel(locale, id, v)));
}

function startingPoint(answers: Answer[], locale: Locale): string {
  const parts: string[] = [];
  const stage = labels(answers, "A2", locale)[0];
  const age = chosen(answers, "A1").map((v) => optionLabel(locale, "A1", v))[0];
  if (stage || age) parts.push(fill(C.startStage[locale], { stage: stage ?? C.nothingYet[locale], age: age ?? C.nothingYet[locale] }));
  const interests = chosen(answers, "B1");
  if (interests.includes("unsure") || interests.length === 0) parts.push(C.startUnsure[locale]);
  else parts.push(fill(C.startInterests[locale], { list: join(labels(answers, "B1", locale), locale) }));
  const hard = labels(answers, "E1", locale, 4);
  if (hard.length) parts.push(fill(C.startHard[locale], { list: join(hard, locale) }));
  const values = labels(answers, "F1", locale, 3);
  if (values.length) parts.push(fill(C.startValues[locale], { list: join(values, locale) }));
  parts.push(C.startClose[locale]);
  return parts.join(" ");
}

function side(answers: Answer[], id: string): "low" | "high" | null {
  const v = scaleValue(answers, id);
  if (v === null || v === 3) return null;
  return v <= 2 ? "low" : "high";
}

function patterns(answers: Answer[], locale: Locale): string[] {
  const out: string[] = [];
  const pairs: [string, keyof typeof C, keyof typeof C][] = [
    ["C1", "patternAlone", "patternTeam"],
    ["C2", "patternQuiet", "patternPeople"],
    ["C3", "patternPractice", "patternTheory"],
    ["C4", "patternRules", "patternOpen"],
    ["C5", "patternStable", "patternNew"],
  ];
  for (const [id, low, high] of pairs) {
    const s = side(answers, id);
    if (s) out.push((C[s === "low" ? low : high] as { [k in Locale]: string })[locale]);
  }
  const interests = chosen(answers, "B1").filter((v) => v !== "unsure");
  if (interests.length >= 3) out.push(fill(C.patternWide[locale], { list: join(labels(answers, "B1", locale), locale) }));
  if (!out.length) out.push(C.patternDefault[locale]);
  return out.slice(0, 5);
}

function unnoticed(answers: Answer[], locale: Locale, tags: Set<TagRef>): string[] {
  const out: string[] = [];
  if (tags.has("fears:wrong-choice")) out.push(C.unnoticedWrongChoice[locale]);
  if (tags.has("start:family-pressure") || tags.has("fears:disappointing-parents")) out.push(C.unnoticedFamily[locale]);
  if (tags.has("challenges:money") || tags.has("start:low-income")) out.push(C.unnoticedMoney[locale]);
  if (tags.has("fears:not-talented-enough")) out.push(C.unnoticedTalent[locale]);
  if (tags.has("fears:too-late") || tags.has("start:late-start")) out.push(C.unnoticedTooLate[locale]);
  if (tags.has("fears:judgement")) out.push(C.unnoticedCompare[locale]);
  if (tags.has("challenges:language")) out.push(C.unnoticedLanguage[locale]);
  if (chosen(answers, "E1").includes("noIdea") || chosen(answers, "B1").includes("unsure")) out.push(C.unnoticedNoIdea[locale]);
  const experience = labels(answers, "D1", locale).filter((_, i) => chosen(answers, "D1")[i] !== "none");
  if (experience.length) out.push(fill(C.unnoticedExperience[locale], { list: join(experience, locale) }));
  if (!out.length) out.push(C.unnoticedDefault[locale]);
  return out.slice(0, 4);
}
