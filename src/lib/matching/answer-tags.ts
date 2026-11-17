import { AXES, type Answer, type Axis } from "@/lib/data/types";
import { AXIS_TAGS } from "@/lib/data/tags";
import { OTHER_PREFIX } from "@/lib/questionnaire/bank";

/** "axis:tag", e.g. "start:small-town". Tags come from the closed list in `AXIS_TAGS`. */
export type TagRef = `${Axis}:${string}`;

/**
 * Mapping table: QUESTION_BANK id -> option key (or scale value "1".."5") -> tags.
 * This is the single place where questionnaire answers turn into matching tags; story
 * matching (match.ts) and the rule-based report (report/fallback.ts) both use it.
 */
export const ANSWER_TAGS: Record<string, Record<string, readonly TagRef[]>> = {
  A1: {
    a23_29: ["transitions:career-change"],
    a30_39: ["start:late-start", "transitions:late-career-change"],
    a40p: ["start:late-start", "transitions:late-career-change"],
  },
  A2: {
    school: ["education:school", "transitions:school-to-university"],
    college: ["education:vocational", "transitions:school-to-university"],
    university: ["education:university", "transitions:university-to-work"],
    work: ["transitions:career-change"],
    other: ["transitions:gap-year"],
  },
  A6: {
    none: ["fears:unknown-future"],
    pause: ["transitions:gap-year", "decisions:take-a-break"],
  },
  // B1 option keys are exactly the `interests` tags (plus "unsure", which maps to nothing).
  B1: Object.fromEntries(AXIS_TAGS.interests.map((t) => [t, [`interests:${t}` as TagRef]])),
  C4: { "4": ["motives:curiosity"], "5": ["motives:curiosity"] },
  C5: {
    "1": ["motives:stability"],
    "2": ["motives:stability"],
    "4": ["decisions:experiments"],
    "5": ["decisions:experiments"],
  },
  D1: {
    organized: ["interests:people"],
    volunteered: ["decisions:volunteering"],
    competition: ["motives:recognition"],
    project: ["decisions:side-project"],
    research: ["interests:science"],
  },
  E1: {
    noIdea: ["fears:unknown-future"],
    tooMany: ["fears:unknown-future"],
    wrongChoice: ["fears:wrong-choice"],
    family: ["fears:disappointing-parents", "challenges:family"],
    money: ["challenges:money"],
    noInfo: ["challenges:information"],
    noTalent: ["fears:not-talented-enough", "challenges:confidence"],
    compare: ["fears:judgement", "challenges:confidence"],
    tooLate: ["fears:too-late"],
  },
  E2: {
    yes: ["start:family-pressure", "challenges:family"],
    little: ["start:family-pressure"],
  },
  E2b: {
    closeToHome: ["challenges:location"],
    income: ["motives:money"],
  },
  E3: { yes: ["transitions:major-change", "education:changed-major"] },
  E4: {
    "4": ["fears:not-talented-enough", "challenges:confidence"],
    "5": ["fears:not-talented-enough", "challenges:confidence"],
  },
  F1: {
    freedom: ["motives:freedom"],
    stability: ["motives:stability", "motives:money"],
    impact: ["motives:impact"],
    creativity: ["interests:creative"],
    recognition: ["motives:recognition"],
    growth: ["motives:curiosity"],
  },
  G1: {
    finance: ["challenges:money"],
    access: ["challenges:information"],
    language: ["challenges:language"],
    time: ["challenges:time"],
    place: ["challenges:location"],
    family: ["challenges:family"],
  },
  G2: {
    partial: ["challenges:money"],
    needScholarship: ["start:low-income", "challenges:money", "fears:money"],
  },
  G3: {
    limited: ["challenges:information"],
    veryLimited: ["start:no-support", "challenges:information"],
  },
  G4: { enBasic: ["challenges:language"] },
  G5: { little: ["challenges:time"] },
  G6: {
    flexible: ["decisions:move-abroad"],
    country: ["challenges:location"],
    city: ["challenges:location"],
  },
  G7: { some: ["challenges:family"], main: ["challenges:family"] },
};

/**
 * A3 (country and city) is free text. A few plain keywords give a rough "starting conditions"
 * tag; nothing else is inferred from it. Lower-case, matched as substrings.
 */
const PLACE_KEYWORDS: { tag: TagRef; words: string[] }[] = [
  {
    tag: "start:small-town",
    words: ["село", "посёлок", "поселок", "аул", "ауыл", "деревн", "райцентр", "небольшой город", "маленький город", "моногород", "шағын қала", "village", "small town", "rural"],
  },
  {
    tag: "start:big-city",
    words: ["алматы", "астана", "шымкент", "москва", "ташкент", "бишкек", "большой город", "мегаполис", "үлкен қала", "big city", "capital"],
  },
];

export interface AnswerTag {
  tag: TagRef;
  questionId: string;
  /** Option key / scale value the tag came from ("" for free-text keywords). */
  option: string;
}

function values(a: Answer): string[] {
  if (a.skipped) return [];
  const raw = Array.isArray(a.value) ? a.value : [a.value];
  return raw.filter((v) => v !== "" && !v.startsWith(OTHER_PREFIX));
}

/** Every tag the answers produce, with the answer it came from (first source wins per tag). */
export function answerTagEntries(answers: Answer[]): AnswerTag[] {
  const seen = new Set<string>();
  const out: AnswerTag[] = [];
  const push = (tag: TagRef, questionId: string, option: string) => {
    if (seen.has(tag)) return;
    seen.add(tag);
    out.push({ tag, questionId, option });
  };
  for (const a of answers) {
    if (a.questionId === "A3" && !a.skipped && typeof a.value === "string") {
      const text = a.value.toLowerCase();
      // First matching group wins ("небольшой город" contains "большой город").
      const hit = PLACE_KEYWORDS.find(({ words }) => words.some((w) => text.includes(w)));
      if (hit) push(hit.tag, "A3", "");
      continue;
    }
    const table = ANSWER_TAGS[a.questionId];
    if (!table) continue;
    for (const v of values(a)) for (const tag of table[v] ?? []) push(tag, a.questionId, v);
  }
  return out;
}

export function splitTag(ref: TagRef): { axis: Axis; tag: string } {
  const i = ref.indexOf(":");
  return { axis: ref.slice(0, i) as Axis, tag: ref.slice(i + 1) };
}

/** The answers as tags on the 8 matching axes (unique, in answer order). */
export function answersToTags(answers: Answer[]): Record<Axis, string[]> {
  const out = Object.fromEntries(AXES.map((a) => [a, [] as string[]])) as Record<Axis, string[]>;
  for (const { tag } of answerTagEntries(answers)) {
    const { axis, tag: t } = splitTag(tag);
    out[axis].push(t);
  }
  return out;
}

/** Scale answer (1..5) or null when unanswered/skipped. */
export function scaleValue(answers: Answer[], id: string): number | null {
  const a = answers.find((x) => x.questionId === id);
  if (!a || a.skipped || typeof a.value !== "string") return null;
  const n = Number(a.value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}
