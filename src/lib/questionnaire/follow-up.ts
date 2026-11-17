import type { Answer, Locale } from "@/lib/data/types";
import { getQuestion } from "./bank";
import { followUpSource, isFollowUpId } from "./engine";

/**
 * An AI-written clarifying question. Plain text, already in the interface language.
 * It is shown as a free-text screen right after the question it follows.
 */
export interface FollowUp {
  title: string;
  hint?: string;
  whyWeAsk?: string;
}

/** At most this many AI follow-ups are asked in one session (authoritative cap, enforced by the UI hook). */
export const MAX_FOLLOW_UPS = 2;

export interface FollowUpContext {
  /** The bank question that was just answered. */
  questionId: string;
  locale: Locale;
  /** Aborted when the UI gives up (timeout) or the person moves on. */
  signal?: AbortSignal;
}

/**
 * Pluggable hook: given the answers so far, return one follow-up question or null.
 * Must never throw (the UI also guards against it) and should be quick (UI gives up after 6 s).
 */
export type FetchFollowUp = (answers: Answer[], context?: FollowUpContext) => Promise<FollowUp | null>;

/** True when a follow-up was already asked in the block of `questionId` (at most one per block). */
export function blockHasFollowUp(answers: Answer[], questionId: string): boolean {
  const block = getQuestion(questionId)?.block;
  return answers.some((a) => isFollowUpId(a.questionId) && getQuestion(followUpSource(a.questionId))?.block === block);
}

let demoStatus: Promise<boolean> | null = null;

/** GET /api/ai/status once per page load; any error counts as demo (no follow-ups). */
function isDemo(): Promise<boolean> {
  demoStatus ??= fetch("/api/ai/status")
    .then((r) => (r.ok ? r.json() : { demo: true }))
    .then((s: { demo?: boolean }) => s.demo !== false)
    .catch(() => true);
  return demoStatus;
}

/** Default hook: asks `/api/ai/followup` (null in demo mode, on errors, or when the block already had one). */
export const fetchFollowUp: FetchFollowUp = async (answers, context) => {
  if (typeof window === "undefined" || !context) return null;
  if (blockHasFollowUp(answers, context.questionId)) return null;
  try {
    if (await isDemo()) return null;
    const res = await fetch("/api/ai/followup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers, locale: context.locale, questionId: context.questionId }),
      signal: context.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { followUp?: { question?: string } | null };
    const title = data.followUp?.question?.trim();
    return title ? { title } : null;
  } catch {
    return null;
  }
};
