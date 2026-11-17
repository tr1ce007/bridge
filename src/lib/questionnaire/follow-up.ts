import type { Answer } from "@/lib/data/types";

/**
 * An AI-written clarifying question (Task 4). Plain text, already in the interface language.
 * It is shown as a free-text screen right after the question it follows.
 */
export interface FollowUp {
  title: string;
  hint?: string;
  whyWeAsk?: string;
}

/** At most this many AI follow-ups are asked in one session. */
export const MAX_FOLLOW_UPS = 2;

/**
 * Pluggable hook: given the answers so far, return one follow-up question or null.
 * Must never throw (the UI also guards against it) and should be quick (UI gives up after 6 s).
 *
 * Now a no-op. Task 4 replaces the body with a call to `/api/ai/followup`; the explore page
 * already uses this function, so nothing else has to change.
 */
export type FetchFollowUp = (answers: Answer[]) => Promise<FollowUp | null>;

export const fetchFollowUp: FetchFollowUp = async () => null;
