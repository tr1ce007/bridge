import type { Answer } from "@/lib/data/types";

/** A finished questionnaire that passes `canGenerateReport` (blocks A, B, C, E, F answered). */
export function sampleAnswers(overrides: Answer[] = []): Answer[] {
  const base: Answer[] = [
    { questionId: "A1", value: "a18_22" },
    { questionId: "A2", value: "university" },
    { questionId: "A3", value: "Казахстан, небольшой город" },
    { questionId: "A4", value: "Цифровые технологии" },
    { questionId: "B1", value: ["tech", "people", "sport"] },
    { questionId: "B2", value: "Могу часами говорить про теннис и про то, как работают нейросети" },
    { questionId: "C1", value: "4" },
    { questionId: "C3", value: "2" },
    { questionId: "C5", value: "4" },
    { questionId: "E1", value: ["wrongChoice", "money", "noInfo"] },
    { questionId: "E2", value: "little" },
    { questionId: "F1", value: ["freedom", "growth", "impact"] },
    { questionId: "G1", value: ["finance", "language"] },
    { questionId: "G2", value: "needScholarship" },
  ];
  const ids = new Set(overrides.map((a) => a.questionId));
  return [...base.filter((a) => !ids.has(a.questionId)), ...overrides];
}
