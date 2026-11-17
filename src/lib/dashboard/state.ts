import type { QuestionnaireSession } from "@/lib/data/types";
import { canGenerateReport, nextQuestion } from "@/lib/questionnaire/engine";
import { restoreSession } from "@/lib/questionnaire/session";
import type { QuestionnaireState } from "./next-steps";

/** Where the person is in the questionnaire, from the saved session. */
export function questionnaireProgress(session: QuestionnaireSession | null): { state: QuestionnaireState; canGenerate: boolean } {
  const answers = session ? restoreSession(session).answers : [];
  if (answers.length === 0) return { state: "not-started", canGenerate: false };
  return { state: nextQuestion(answers) === null ? "done" : "in-progress", canGenerate: canGenerateReport(answers).ok };
}
