import ru from "../../../messages/ru.json";
import kk from "../../../messages/kk.json";
import en from "../../../messages/en.json";
import type { Answer, Locale } from "@/lib/data/types";
import { OTHER_PREFIX, getQuestion } from "@/lib/questionnaire/bank";
import { isFollowUpId } from "@/lib/questionnaire/engine";

/**
 * Server-side access to the questionnaire copy (`q.<id>` in messages) so answers can be shown
 * in words: in the AI profile summary and in "supporting answers" of the rule-based report.
 */
type QCopy = { title: string; options?: Record<string, string>; scaleMin?: string; scaleMax?: string };
const Q: Record<Locale, Record<string, QCopy>> = {
  ru: ru.q as Record<string, QCopy>,
  kk: kk.q as Record<string, QCopy>,
  en: en.q as Record<string, QCopy>,
};

function copy(locale: Locale, id: string): QCopy | undefined {
  const q = getQuestion(id);
  return Q[locale][q?.optionsKey ?? id] ?? Q[locale][id];
}

export function questionTitle(locale: Locale, id: string): string {
  return Q[locale][id]?.title ?? id;
}

const SCALE_VALUES = new Set(["1", "2", "3", "4", "5"]);

/**
 * True when `value` is something the bank defines for question `id`: an option key, a scale value
 * 1–5, or an `other:` free-text entry where the question allows one. Anything else is a value the
 * client made up and must not be shown or put into a prompt.
 */
export function isKnownValue(id: string, value: string): boolean {
  const q = getQuestion(id);
  if (!q || q.type === "text") return false;
  if (value.startsWith(OTHER_PREFIX)) return Boolean(q.allowOther);
  if (q.type === "scale") return SCALE_VALUES.has(value);
  return Boolean(q.options?.includes(value));
}

/**
 * Label of a known option key, a scale value ("3 / 5") or the free text of an `other:` entry.
 * Unknown values return "" (callers should filter with `isKnownValue` first).
 */
export function optionLabel(locale: Locale, id: string, value: string): string {
  if (!isKnownValue(id, value)) return "";
  if (value.startsWith(OTHER_PREFIX)) return value.slice(OTHER_PREFIX.length).trim();
  if (getQuestion(id)?.type === "scale") return `${value} / 5`;
  return copy(locale, id)?.options?.[value] ?? "";
}

/** Text of a scale's ends, e.g. "1 = Лучше самому, 5 = Лучше в команде". */
export function scaleEnds(locale: Locale, id: string): string | null {
  const c = copy(locale, id);
  return c?.scaleMin && c.scaleMax ? `1 = ${c.scaleMin}; 5 = ${c.scaleMax}` : null;
}

/** "Question title: chosen label(s)" for option / scale answers; null for skipped or text answers. */
export function describeChoice(locale: Locale, answer: Answer): string | null {
  if (answer.skipped || isFollowUpId(answer.questionId)) return null;
  const q = getQuestion(answer.questionId);
  if (!q || q.type === "text") return null;
  const values = (Array.isArray(answer.value) ? answer.value : [answer.value]).filter((v) => v !== "" && isKnownValue(q.id, v));
  if (!values.length) return null;
  return `${questionTitle(locale, q.id)} — ${values.map((v) => optionLabel(locale, q.id, v)).join(", ")}`;
}
