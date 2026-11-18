"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BLOCKS, getQuestion, type Block, type Question } from "@/lib/questionnaire/bank";
import { isFollowUpId } from "@/lib/questionnaire/engine";
import type { Answer } from "@/lib/data/types";
import { useQuestionCopy } from "./use-question-copy";

type Props = {
  answers: Answer[];
  /** Visible questions that are still unanswered. */
  pending: Question[];
  onEdit: (id: string) => void;
  onContinue: () => void;
};

/** "Your answers": every answer grouped by block, each with an Edit button. */
export function ReviewList({ answers, pending, onEdit, onContinue }: Props) {
  const t = useTranslations("explore");
  const copy = useQuestionCopy();

  const rows = BLOCKS.map((block: Block) => {
    const items: { key: string; title: string; text: string | null; id: string | null; followUp: boolean; unanswered?: boolean }[] = [];
    // answers and pending questions, merged in bank order
    const entries = [
      ...answers
        .filter((a) => {
          const id = isFollowUpId(a.questionId) ? a.questionId.slice(3) : a.questionId;
          return getQuestion(id)?.block === block;
        })
        .map((a) => ({ a, q: undefined as Question | undefined })),
      ...pending.filter((q) => q.block === block).map((q) => ({ a: undefined as Answer | undefined, q })),
    ];
    for (const e of entries) {
      if (e.a) {
        const fu = isFollowUpId(e.a.questionId);
        const q = fu ? undefined : getQuestion(e.a.questionId);
        items.push({
          key: e.a.questionId,
          title: fu ? copy.followUpQuestionText(e.a) : q ? copy.title(q) : e.a.questionId,
          text: copy.formatAnswer(q, e.a),
          id: fu ? null : e.a.questionId,
          followUp: fu,
        });
      } else if (e.q) {
        items.push({ key: e.q.id, title: copy.title(e.q), text: null, id: e.q.id, followUp: false, unanswered: true });
      }
    }
    return { block, items };
  }).filter((r) => r.items.length > 0);

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("reviewTitle")}</h2>
      <p className="mt-3 text-muted">{t("reviewLead")}</p>

      {rows.length === 0 && <p className="mt-8 text-muted">{t("reviewEmpty")}</p>}

      <div className="mt-8 space-y-8">
        {rows.map(({ block, items }) => (
          <section key={block} aria-labelledby={`review-${block}`}>
            <h3 id={`review-${block}`} className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">
              {t(`blocks.${block}`)}
            </h3>
            <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
              {items.map((it) => (
                <li key={it.key} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm text-muted">{it.title}</p>
                    {it.text ? (
                      <p className="mt-1 break-words text-[15px] leading-snug">{it.text}</p>
                    ) : (
                      <p className="mt-1.5">
                        <Badge tone={it.unanswered ? "warning" : "neutral"}>{it.unanswered ? t("unanswered") : t("skipped")}</Badge>
                      </p>
                    )}
                  </div>
                  {it.id && (
                    <button
                      type="button"
                      onClick={() => onEdit(it.id!)}
                      className="min-h-11 shrink-0 rounded-full px-3 text-sm font-medium text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]"
                    >
                      {it.unanswered ? t("answerThis") : t("edit")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8">
        <Button onClick={onContinue}>
          {t("continue")} <span aria-hidden="true">→</span>
        </Button>
      </div>
    </div>
  );
}
