"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OTHER_PREFIX } from "@/lib/questionnaire/bank";
import type { Answer } from "@/lib/data/types";
import { ChoiceInput } from "./choice-input";
import { ScaleInput } from "./scale-input";
import type { CardQuestion } from "./use-question-copy";

type Draft = string | string[];

function initialDraft(q: CardQuestion, a?: Answer): Draft {
  if (a && !a.skipped) return a.value;
  return q.type === "multi" ? [] : "";
}

function isFilled(draft: Draft): boolean {
  return Array.isArray(draft) ? draft.some((x) => x.trim() !== "" && x !== OTHER_PREFIX) : draft.trim() !== "";
}

type Props = {
  question: CardQuestion;
  /** Existing answer (when going back or editing). */
  initial?: Answer;
  /** Editing from the review list: the primary button says "Save". */
  editing?: boolean;
  onSubmit: (value: Draft) => void;
  onSkip: () => void;
  onBack?: () => void;
  /** Move keyboard focus to the question title (after the person navigated). */
  focusTitle?: boolean;
};

/** One question on one screen: title, hint, "why we ask", the input and Back / Skip / Next. */
export function QuestionCard({ question: q, initial, editing, onSubmit, onSkip, onBack, focusTitle }: Props) {
  const t = useTranslations("explore");
  const [draft, setDraft] = useState<Draft>(() => initialDraft(q, initial));
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = `q-${q.id.replace(/\W/g, "-")}-title`;

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus({ preventScroll: true });
  }, [focusTitle]);

  const filled = isFilled(draft);
  const canSubmit = filled || !q.required;

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSubmit) return;
    if (!filled) onSkip();
    else onSubmit(typeof draft === "string" ? draft.trim() : draft);
  }

  function onTextKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
  }

  const whyWeAsk = q.whyWeAsk ? (
    q.sensitive ? (
      <p className="mt-5 rounded-r-xl border-l-2 border-primary bg-primary-soft/60 p-4 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-fg">{t("whyWeAskLabel")}. </span>
        {q.whyWeAsk}
      </p>
    ) : (
      <details className="mt-5 text-sm text-muted">
        <summary className="inline-flex min-h-11 cursor-pointer items-center underline-offset-4 hover:text-fg hover:underline">
          {t("whyWeAskLabel")}
        </summary>
        <p className="rounded-r-xl border-l-2 border-primary bg-primary-soft/60 p-4 leading-relaxed">{q.whyWeAsk}</p>
      </details>
    )
  ) : null;

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-wrap items-center gap-2">
        {q.isFollowUp && <Badge tone="primary">{t("followUpTag")}</Badge>}
        {q.sensitive ? (
          <Badge tone="accent">{t("sensitive")}</Badge>
        ) : (
          !q.required && <Badge>{t("optional")}</Badge>
        )}
      </div>

      <h2
        id={titleId}
        ref={titleRef}
        tabIndex={-1}
        // Focused by script only (not a control), so no focus ring. Inline because the global
        // :focus-visible rule is unlayered and would beat Tailwind's outline-none.
        style={{ outline: "none" }}
        className="mt-4 font-display text-2xl font-semibold leading-snug tracking-tight text-balance sm:text-3xl"
      >
        {q.title}
      </h2>
      {q.hint && <p className="mt-3 text-base leading-relaxed text-muted text-pretty">{q.hint}</p>}
      {whyWeAsk}

      <div className="mt-7">
        {(q.type === "single" || q.type === "multi") && (
          <>
            <ChoiceInput
              type={q.type}
              name={q.id}
              options={q.options}
              allowOther={q.allowOther}
              otherLabel={t("other")}
              otherPlaceholder={t("otherPlaceholder")}
              maxSelect={q.maxSelect}
              exclusive={q.exclusive}
              value={draft}
              onChange={setDraft}
              labelledBy={titleId}
            />
            {q.type === "multi" && q.maxSelect && (
              <p className="mt-3 text-sm text-muted">{t("maxSelect", { n: q.maxSelect })}</p>
            )}
          </>
        )}
        {q.type === "scale" && (
          <ScaleInput
            name={q.id}
            value={typeof draft === "string" ? draft : ""}
            onChange={setDraft}
            min={q.scaleMin}
            max={q.scaleMax}
            labelledBy={titleId}
          />
        )}
        {q.type === "text" && (
          <textarea
            rows={5}
            maxLength={1500}
            value={typeof draft === "string" ? draft : ""}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onTextKeyDown}
            placeholder={t("textPlaceholder")}
            aria-labelledby={titleId}
            className="w-full resize-y rounded-2xl border border-border bg-card shadow-card p-4 text-base leading-relaxed placeholder:text-muted/80 focus:border-primary"
          />
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <span aria-hidden="true">←</span> {t("back")}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!q.required && (
            <button
              type="button"
              onClick={onSkip}
              className="min-h-11 rounded-full px-4 text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
            >
              {t("skip")}
            </button>
          )}
          <Button type="submit" disabled={!canSubmit}>
            {editing ? t("save") : t("next")}
            {!editing && <span aria-hidden="true">→</span>}
          </Button>
        </div>
      </div>
    </form>
  );
}
