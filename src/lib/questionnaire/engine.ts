import type { Answer } from "@/lib/data/types";
import { QUESTION_BANK, REQUIRED_BLOCKS, bankIndex, getQuestion, type Block, type Question } from "./bank";

/** A path through the questionnaire is never longer than this (AI follow-ups count too). */
export const MAX_QUESTIONS = 30;
/** ...and (with required blocks answered or skipped-optionals) never shorter than this. */
export const MIN_QUESTIONS = 15;

// ---------------------------------------------------------------- AI follow-up ids

const FU_PREFIX = "fu:";

/** Answers to AI follow-up questions use the id `fu:<id of the bank question they follow>`. */
export function followUpId(sourceQuestionId: string): string {
  return FU_PREFIX + sourceQuestionId;
}
export function isFollowUpId(id: string): boolean {
  return id.startsWith(FU_PREFIX);
}
function followUpSource(id: string): string {
  return id.slice(FU_PREFIX.length);
}

// ---------------------------------------------------------------- visibility

/** Bank questions that apply to this person right now, in order (answered or not). */
export function visibleQuestions(answers: Answer[]): Question[] {
  return QUESTION_BANK.filter((q) => !q.showIf || q.showIf(answers));
}

function followUpCount(answers: Answer[]): number {
  return answers.filter((a) => isFollowUpId(a.questionId)).length;
}

/** True when the answer actually contains something (skipped / empty answers do not count). */
export function hasValue(a: Answer | undefined): boolean {
  if (!a || a.skipped) return false;
  return Array.isArray(a.value) ? a.value.some((x) => x.trim() !== "") : a.value.trim() !== "";
}

// ---------------------------------------------------------------- next question

/**
 * Unanswered visible questions that may still be asked, in order (a skipped question counts as
 * answered). Once MAX_QUESTIONS answers (bank + AI follow-ups) exist, only required questions remain.
 */
export function pendingQuestions(answers: Answer[]): Question[] {
  const answered = new Set(answers.map((a) => a.questionId));
  let used = visibleQuestions(answers).filter((q) => answered.has(q.id)).length + followUpCount(answers);
  const pending: Question[] = [];
  for (const q of visibleQuestions(answers)) {
    if (answered.has(q.id)) continue;
    if (used >= MAX_QUESTIONS && !q.required) continue;
    pending.push(q);
    used++;
  }
  return pending;
}

/** The first pending question, or null when the questionnaire is finished. */
export function nextQuestion(answers: Answer[]): Question | null {
  return pendingQuestions(answers)[0] ?? null;
}

/**
 * Soft progress 0-1: answered / (answered + still to come on the current branch).
 * It can dip slightly when a follow-up branch opens; it is meant for a thin bar, not a score.
 */
export function progress(answers: Answer[]): number {
  const answered = new Set(answers.map((a) => a.questionId));
  const done = visibleQuestions(answers).filter((q) => answered.has(q.id)).length + followUpCount(answers);
  const remaining = pendingQuestions(answers).length;
  if (done === 0) return 0;
  return remaining === 0 ? 1 : done / (done + remaining);
}

// ---------------------------------------------------------------- report gate

/** Visible required questions that do not (yet) hold a real answer. */
export function missingRequired(answers: Answer[]): Question[] {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  return visibleQuestions(answers).filter((q) => q.required && !hasValue(byId.get(q.id)));
}

/** Report is allowed once every required question of blocks A, B, C, E, F has an answer. */
export function canGenerateReport(answers: Answer[]): { ok: boolean; missing: Block[] } {
  const missingBlocks = new Set(missingRequired(answers).map((q) => q.block));
  const missing = REQUIRED_BLOCKS.filter((b) => missingBlocks.has(b));
  return { ok: missing.length === 0, missing };
}

// ---------------------------------------------------------------- editing answers

/** Empty answer recorded when an optional question is skipped. */
export function skipAnswer(q: Question): Answer {
  return { questionId: q.id, value: q.type === "multi" ? [] : "", skipped: true };
}

/** Stable storage order: bank order, each AI follow-up directly after its source question. */
function orderKey(id: string): number {
  if (isFollowUpId(id)) return bankIndex(followUpSource(id)) + 0.5;
  return bankIndex(id);
}

/**
 * Records one answer (replacing an earlier answer to the same question), then removes answers that
 * no longer apply: questions hidden by the new branch, answers of unknown questions, and the AI
 * follow-up of a question that was just re-answered. Result is in bank order.
 */
export function applyAnswer(answers: Answer[], answer: Answer): Answer[] {
  let next = answers.filter((a) => a.questionId !== answer.questionId);
  if (!isFollowUpId(answer.questionId)) {
    next = next.filter((a) => a.questionId !== followUpId(answer.questionId));
  }
  next.push(answer);
  next = pruneHidden(next);
  return next.sort((a, b) => orderKey(a.questionId) - orderKey(b.questionId));
}

/** Drops answers for questions that are not visible (repeats, because a drop can hide others). */
export function pruneHidden(answers: Answer[]): Answer[] {
  let current = answers;
  for (let i = 0; i < QUESTION_BANK.length; i++) {
    const visible = new Set(visibleQuestions(current).map((q) => q.id));
    const kept = current.filter((a) => {
      if (isFollowUpId(a.questionId)) return visible.has(followUpSource(a.questionId));
      return visible.has(a.questionId);
    });
    if (kept.length === current.length) return current;
    current = kept;
  }
  return current;
}

/** The answered visible question before `currentId` (or the last answered one when currentId is null). */
export function previousQuestion(answers: Answer[], currentId: string | null): Question | null {
  const answered = new Set(answers.map((a) => a.questionId));
  const visible = visibleQuestions(answers);
  const end = currentId === null ? visible.length : visible.findIndex((q) => q.id === currentId);
  const upto = end === -1 ? visible.length : end;
  for (let i = upto - 1; i >= 0; i--) if (answered.has(visible[i].id)) return visible[i];
  return null;
}

/** First visible required question of a block that still has no real answer (for "jump back"). */
export function firstMissingInBlock(answers: Answer[], block: Block): Question | null {
  return missingRequired(answers).find((q) => q.block === block) ?? null;
}

export { getQuestion };
