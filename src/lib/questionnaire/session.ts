import type { Answer, QuestionnaireSession } from "@/lib/data/types";
import { visibleQuestions, nextQuestion } from "./engine";

function newId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Empty session; the first question (A1) is implied by `currentId: null` + no answers. */
export function createSession(now: Date = new Date()): QuestionnaireSession {
  const t = now.toISOString();
  return { id: newId(), answers: [], currentId: "A1", startedAt: t, updatedAt: t };
}

/** Same session with new answers; `currentId` always points at the next unanswered question. */
export function withAnswers(session: QuestionnaireSession, answers: Answer[], now: Date = new Date()): QuestionnaireSession {
  return { ...session, answers, currentId: nextQuestion(answers)?.id ?? null, updatedAt: now.toISOString() };
}

/**
 * Where to continue a restored session: the saved `currentId` when it is still a visible, unanswered
 * question; otherwise the first unanswered question. null = finished.
 */
export function resumeQuestionId(session: QuestionnaireSession): string | null {
  const next = nextQuestion(session.answers);
  if (!next) return null;
  const saved = session.currentId;
  if (saved && visibleQuestions(session.answers).some((q) => q.id === saved)) {
    const answered = session.answers.some((a) => a.questionId === saved);
    if (!answered) return saved;
  }
  return next.id;
}
