"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { canGenerateReport, firstMissingInBlock } from "@/lib/questionnaire/engine";
import type { Answer } from "@/lib/data/types";

type Props = {
  answers: Answer[];
  onJump: (questionId: string) => void;
  onReview: () => void;
};

/** End of the questionnaire: a way to the report, or the blocks that are still missing. */
export function CompleteScreen({ answers, onJump, onReview }: Props) {
  const t = useTranslations("explore");
  const gate = canGenerateReport(answers);

  if (gate.ok) {
    return (
      <div>
        <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
          {t("completeTitle")}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted text-pretty">{t("completeLead")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button href="/report/new">
            {t("completeCta")} <span aria-hidden="true">→</span>
          </Button>
          <Button variant="ghost" onClick={onReview}>
            {t("completeReview")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
        {t("missingTitle")}
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-muted">{t("missingLead")}</p>
      <ul className="mt-6 flex flex-wrap gap-3">
        {gate.missing.map((block) => {
          const q = firstMissingInBlock(answers, block);
          return (
            <li key={block}>
              <Button variant="ghost" onClick={() => q && onJump(q.id)}>
                {t("missingGo", { block: t(`blocks.${block}`) })}
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="mt-8">
        <Button variant="ghost" onClick={onReview}>
          {t("completeReview")}
        </Button>
      </div>
    </div>
  );
}
