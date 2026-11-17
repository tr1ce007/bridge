import type { Answer } from "@/lib/data/types";

/**
 * Question bank for the adaptive questionnaire (spec §5, dimensions A-G).
 * Copy for every question lives in the messages under `q.<id>`:
 *   title, hint?, whyWeAsk? (required for sensitive/required questions),
 *   options.<key> for every option, scaleMin/scaleMax for scales.
 * The engine (engine.ts) decides what is shown next; this file is data only.
 */

export const BLOCKS = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type Block = (typeof BLOCKS)[number];

/** Report generation is blocked until every required question of these blocks is answered. */
export const REQUIRED_BLOCKS: readonly Block[] = ["A", "B", "C", "E", "F"];

export type QuestionType = "single" | "multi" | "text" | "scale";

export interface Question {
  id: string;
  block: Block;
  /** Required questions cannot be skipped and gate the report. */
  required: boolean;
  type: QuestionType;
  /** single/multi: option keys; message `q.<id>.options.<key>`. Scales use 1-5 (see scaleMin/scaleMax). */
  options?: readonly string[];
  /** Override of the message namespace (`q.<optionsKey>`) when copy is shared; defaults to the id. */
  optionsKey?: string;
  /** Show an "other (write your own)" chip; stored as `other:<text>`. */
  allowOther?: boolean;
  /** multi: at most this many chips can be selected. */
  maxSelect?: number;
  /** multi: choosing one of these clears all other choices (e.g. "none of these"). */
  exclusive?: readonly string[];
  /** Personal/sensitive: always optional, shown with a short "why we ask". */
  sensitive?: boolean;
  /** Adaptive branching. Absent = always shown. */
  showIf?: (answers: Answer[]) => boolean;
}

export const OTHER_PREFIX = "other:";

// ---------------------------------------------------------------- answer helpers (used by showIf)

function raw(answers: Answer[], id: string): Answer["value"] | undefined {
  const a = answers.find((x) => x.questionId === id);
  return a && !a.skipped ? a.value : undefined;
}

/** Every stored entry of an answer, including free-text `other:` ones. */
function entries(answers: Answer[], id: string): string[] {
  const v = raw(answers, id);
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).filter((x) => x !== "");
}

/** The chosen single option or option keys of a multi question (free-text `other:` entries removed). */
export function chosen(answers: Answer[], id: string): string[] {
  return entries(answers, id).filter((x) => !x.startsWith(OTHER_PREFIX));
}

const stageIs =
  (...stages: string[]) =>
  (answers: Answer[]) =>
    chosen(answers, "A2").some((s) => stages.includes(s));

/** Limits picked in G1 (at most three, in the order of the bank) get their own follow-up. */
const limitSelected = (limit: string) => (answers: Answer[]) => chosen(answers, "G1").slice(0, 3).includes(limit);

export const QUESTION_BANK: Question[] = [
  // ---- A. Background
  {
    id: "A1",
    block: "A",
    required: true,
    type: "single",
    options: ["u15", "a15_17", "a18_22", "a23_29", "a30_39", "a40p"],
  },
  {
    id: "A2",
    block: "A",
    required: true,
    type: "single",
    options: ["school", "college", "university", "work", "other"],
  },
  { id: "A3", block: "A", required: false, type: "text", sensitive: true },
  { id: "A4", block: "A", required: false, type: "text", showIf: stageIs("college", "university") },
  { id: "A5", block: "A", required: false, type: "text", showIf: stageIs("work", "other") },
  {
    id: "A6",
    block: "A",
    required: false,
    type: "single",
    options: ["clear", "some", "none", "pause"],
    showIf: stageIs("school"),
  },

  // ---- B. Interests (options are the `interests` tags of the content, see lib/data/tags.ts)
  {
    id: "B1",
    block: "B",
    required: true,
    type: "multi",
    options: [
      "tech",
      "people",
      "creative",
      "science",
      "business",
      "law-politics",
      "health",
      "education",
      "sport",
      "nature",
      "languages-culture",
      "social-impact",
      "unsure",
    ],
    exclusive: ["unsure"],
    allowOther: true,
    maxSelect: 5,
  },
  { id: "B2", block: "B", required: false, type: "text" },
  { id: "B3", block: "B", required: false, type: "text" },
  { id: "B4", block: "B", required: false, type: "text" },

  // ---- C. Working preferences (scales 1-5, no personality labels)
  { id: "C1", block: "C", required: true, type: "scale" },
  { id: "C2", block: "C", required: false, type: "scale" },
  { id: "C3", block: "C", required: true, type: "scale" },
  { id: "C4", block: "C", required: false, type: "scale" },
  { id: "C5", block: "C", required: true, type: "scale" },

  // ---- D. Experiences (optional block)
  {
    id: "D1",
    block: "D",
    required: false,
    type: "multi",
    options: ["organized", "volunteered", "competition", "project", "research", "job", "none"],
    exclusive: ["none"],
    allowOther: true,
  },
  {
    id: "D2",
    block: "D",
    required: false,
    type: "text",
    showIf: (a) => entries(a, "D1").some((x) => x !== "none"),
  },
  { id: "D3", block: "D", required: false, type: "text" },

  // ---- E. Difficulties and uncertainty
  {
    id: "E1",
    block: "E",
    required: true,
    type: "multi",
    options: ["noIdea", "tooMany", "wrongChoice", "family", "money", "noInfo", "noTalent", "compare", "tooLate"],
    allowOther: true,
    maxSelect: 4,
  },
  {
    id: "E2",
    block: "E",
    required: false,
    type: "single",
    options: ["yes", "little", "no"],
    sensitive: true,
  },
  {
    id: "E2b",
    block: "E",
    required: false,
    type: "single",
    options: ["profession", "closeToHome", "income", "general"],
    allowOther: true,
    sensitive: true,
    showIf: (a) => chosen(a, "E2").some((x) => x === "yes" || x === "little"),
  },
  {
    id: "E3",
    block: "E",
    required: false,
    type: "single",
    options: ["yes", "unsure", "no"],
  },
  {
    id: "E3b",
    block: "E",
    required: false,
    type: "text",
    showIf: (a) => chosen(a, "E3").includes("yes"),
  },
  { id: "E4", block: "E", required: false, type: "scale" },

  // ---- F. Values and ambitions
  {
    id: "F1",
    block: "F",
    required: true,
    type: "multi",
    options: ["freedom", "stability", "impact", "creativity", "recognition", "growth"],
    allowOther: true,
    maxSelect: 3,
  },
  { id: "F2", block: "F", required: false, type: "text" },
  { id: "F3", block: "F", required: false, type: "text" },
  { id: "F4", block: "F", required: false, type: "text" },

  // ---- G. Real-life limitations (all optional, all sensitive; follow-ups only for chosen limits)
  {
    id: "G1",
    block: "G",
    required: false,
    type: "multi",
    options: ["finance", "access", "language", "time", "place", "family", "none"],
    exclusive: ["none"],
    maxSelect: 3,
    sensitive: true,
  },
  {
    id: "G2",
    block: "G",
    required: false,
    type: "single",
    options: ["selfFunded", "partial", "needScholarship", "unsure"],
    sensitive: true,
    showIf: limitSelected("finance"),
  },
  {
    id: "G3",
    block: "G",
    required: false,
    type: "single",
    options: ["good", "limited", "veryLimited"],
    sensitive: true,
    showIf: limitSelected("access"),
  },
  {
    id: "G4",
    block: "G",
    required: false,
    type: "multi",
    options: ["ru", "kk", "enBasic", "enGood"],
    allowOther: true,
    sensitive: true,
    showIf: limitSelected("language"),
  },
  {
    id: "G5",
    block: "G",
    required: false,
    type: "single",
    options: ["lots", "some", "little"],
    sensitive: true,
    showIf: limitSelected("time"),
  },
  {
    id: "G6",
    block: "G",
    required: false,
    type: "single",
    options: ["flexible", "country", "city"],
    sensitive: true,
    showIf: limitSelected("place"),
  },
  {
    id: "G7",
    block: "G",
    required: false,
    type: "single",
    options: ["none", "some", "main"],
    sensitive: true,
    showIf: limitSelected("family"),
  },
];

const BY_ID = new Map(QUESTION_BANK.map((q) => [q.id, q]));

export function getQuestion(id: string): Question | undefined {
  return BY_ID.get(id);
}

/** Index in the bank (stable display / storage order); -1 for unknown ids. */
export function bankIndex(id: string): number {
  return QUESTION_BANK.findIndex((q) => q.id === id);
}
