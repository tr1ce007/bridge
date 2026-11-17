"use client";

import { useTranslations } from "next-intl";
import { OTHER_PREFIX, type Question, type QuestionType } from "@/lib/questionnaire/bank";
import type { FollowUp } from "@/lib/questionnaire/follow-up";
import { isFollowUpId } from "@/lib/questionnaire/engine";
import type { Answer } from "@/lib/data/types";

/** A question with its copy already resolved into the interface language. */
export interface CardQuestion {
  id: string;
  type: QuestionType;
  title: string;
  hint?: string;
  whyWeAsk?: string;
  options: { key: string; label: string }[];
  allowOther: boolean;
  maxSelect?: number;
  exclusive: readonly string[];
  scaleMin?: string;
  scaleMax?: string;
  required: boolean;
  sensitive: boolean;
  isFollowUp: boolean;
}

/**
 * Reads `q.<id>.*` messages. Question ids are dynamic, so keys are looked up through
 * `t.has` and cast once, here.
 */
export function useQuestionCopy() {
  const t = useTranslations("q");
  const te = useTranslations("explore");
  const get = (key: string): string | undefined => (t.has(key as never) ? t(key as never) : undefined);

  const ns = (q: Question) => q.optionsKey ?? q.id;

  function card(q: Question): CardQuestion {
    const n = ns(q);
    return {
      id: q.id,
      type: q.type,
      title: get(`${n}.title`) ?? q.id,
      hint: get(`${n}.hint`),
      whyWeAsk: get(`${n}.whyWeAsk`),
      options: (q.options ?? []).map((key) => ({ key, label: get(`${n}.options.${key}`) ?? key })),
      allowOther: Boolean(q.allowOther),
      maxSelect: q.maxSelect,
      exclusive: q.exclusive ?? [],
      scaleMin: get(`${n}.scaleMin`),
      scaleMax: get(`${n}.scaleMax`),
      required: q.required,
      sensitive: Boolean(q.sensitive),
      isFollowUp: false,
    };
  }

  function followUpCard(sourceId: string, f: FollowUp): CardQuestion {
    return {
      id: `fu:${sourceId}`,
      type: "text",
      title: f.title,
      hint: f.hint,
      whyWeAsk: f.whyWeAsk,
      options: [],
      allowOther: false,
      exclusive: [],
      required: false,
      sensitive: false,
      isFollowUp: true,
    };
  }

  /** Human-readable answer for the review list; null when skipped or empty. */
  function formatAnswer(q: Question | undefined, a: Answer): string | null {
    if (a.skipped) return null;
    if (isFollowUpId(a.questionId)) {
      const list = Array.isArray(a.value) ? a.value : [a.value];
      return list[1]?.trim() || null;
    }
    const list = (Array.isArray(a.value) ? a.value : [a.value]).filter((x) => x.trim() !== "");
    if (list.length === 0) return null;
    if (!q) return list.join(", ");
    if (q.type === "scale") return te("scaleValue", { n: list[0] });
    if (q.type === "text") return list[0];
    const n = ns(q);
    return list
      .map((v) => (v.startsWith(OTHER_PREFIX) ? v.slice(OTHER_PREFIX.length) : (get(`${n}.options.${v}`) ?? v)))
      .join(", ");
  }

  /** Title shown in the review list for an AI follow-up answer (the question text is stored in the answer). */
  function followUpQuestionText(a: Answer): string {
    const list = Array.isArray(a.value) ? a.value : [a.value];
    return list[0] ?? te("followUpAnswerLabel");
  }

  return { card, followUpCard, formatAnswer, followUpQuestionText, title: (q: Question) => get(`${ns(q)}.title`) ?? q.id };
}
