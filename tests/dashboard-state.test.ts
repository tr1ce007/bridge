import { describe, expect, it } from "vitest";
import { questionnaireProgress } from "@/lib/dashboard/state";
import { nextQuestion } from "@/lib/questionnaire/engine";
import type { QuestionnaireSession } from "@/lib/data/types";
import { sampleAnswers } from "./helpers/answers";

const session = (answers: QuestionnaireSession["answers"]): QuestionnaireSession => ({
  id: "s",
  answers,
  currentId: null,
  startedAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
});

describe("questionnaireProgress", () => {
  it("is not started without a session or answers", () => {
    expect(questionnaireProgress(null)).toEqual({ state: "not-started", canGenerate: false });
    expect(questionnaireProgress(session([]))).toEqual({ state: "not-started", canGenerate: false });
  });

  it("is in progress after a few answers", () => {
    expect(questionnaireProgress(session([{ questionId: "A1", value: "a18_22" }]))).toEqual({ state: "in-progress", canGenerate: false });
  });

  it("allows the report once the required blocks are answered, even if optional questions remain", () => {
    const answers = sampleAnswers();
    const out = questionnaireProgress(session(answers));
    expect(out.canGenerate).toBe(true);
    expect(out.state).toBe(nextQuestion(answers) === null ? "done" : "in-progress");
  });
});
