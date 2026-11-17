"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExperimentCompletion, ProcessAnswer } from "@/lib/data/types";
import type { ExperimentView } from "@/lib/experiments/view";
import { ReflectionForm, type ReflectionResult } from "./reflection-form";

export interface ExperimentCardProps {
  experiment: ExperimentView;
  directionLabel: string;
  completion: ExperimentCompletion | undefined;
  started: boolean;
  /** Title of the enjoyed experiment this one is similar to (rated 4–5), if any. */
  similarTo: string | undefined;
  open: boolean;
  onToggleOpen: () => void;
  onStart: () => void;
  onUnstart: () => void;
  /** Resolves true when saved. */
  onComplete: (experimentId: string, result: ReflectionResult) => Promise<boolean>;
}

function Dots({ value }: { value: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-1 align-middle">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`size-2.5 rounded-full ${n <= value ? "bg-accent" : "border border-border"}`} />
      ))}
    </span>
  );
}

export function ExperimentCard({
  experiment: e,
  directionLabel,
  completion,
  started,
  similarTo,
  open,
  onToggleOpen,
  onStart,
  onUnstart,
  onComplete,
}: ExperimentCardProps) {
  const t = useTranslations("try");
  const ts = useTranslations("states");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const panelId = `${e.id}-details`;

  async function submit(result: ReflectionResult) {
    setSaving(true);
    setError(null);
    const ok = await onComplete(e.id, result);
    setSaving(false);
    if (ok) {
      setFormOpen(false);
      setJustSaved(true);
    } else {
      setError(ts("saveFailed"));
    }
  }

  const answer: ProcessAnswer | null = completion ? (completion.answer ?? (completion.enjoyedProcess ? "process" : null)) : null;

  return (
    <li id={e.id} className="scroll-mt-24 rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{directionLabel}</Badge>
        {completion ? <Badge tone="accent">{t("statusDone")}</Badge> : started ? <Badge tone="warning">{t("statusInProgress")}</Badge> : null}
        {similarTo && <Badge tone="accent">{t("similarBadge")}</Badge>}
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold leading-snug tracking-tight text-balance sm:text-2xl">{e.title}</h3>
      {similarTo && <p className="mt-2 text-sm text-muted">{t("similarHint", { title: similarTo })}</p>}
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-muted">{t("time")}:</dt>
          <dd className="font-medium">{e.timeEstimate}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted">{t("difficulty")}:</dt>
          <dd className="font-medium">{t(`difficultyLevels.${e.difficulty}`)}</dd>
        </div>
      </dl>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggleOpen}
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline dark:text-[var(--ring)]"
      >
        {open ? t("hideDetails") : t("showDetails")}
        <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          ↓
        </span>
      </button>

      {open && (
        <div id={panelId} className="mt-2 space-y-6 border-t border-border pt-5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("outcome")}</h4>
            <p className="mt-2 leading-relaxed">{e.outcome}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("resources")}</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
              {e.resources.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("steps")}</h4>
            <ol className="mt-2 list-decimal space-y-2 pl-5 leading-relaxed marker:font-semibold marker:text-accent-text">
              {e.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {justSaved && !formOpen && (
        <p role="status" className="mt-4 rounded-xl bg-subtle px-4 py-3 text-sm">
          {t("savedOk")}
        </p>
      )}

      {completion && !formOpen && (
        <div className="mt-5 rounded-2xl border border-border bg-subtle p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("resultTitle")}</h4>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium">
            <Dots value={completion.rating} />
            <span>{t("resultRating", { rating: completion.rating })}</span>
          </p>
          {answer && <p className="mt-1 text-sm">{t("resultAnswer", { answer: t(`answers.${answer}`) })}</p>}
          {completion.reflection && (
            <>
              <h5 className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("resultNotes")}</h5>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{completion.reflection}</p>
            </>
          )}
        </div>
      )}

      {formOpen ? (
        <ReflectionForm
          questions={e.reflection.slice(1)}
          saving={saving}
          error={error}
          onSubmit={submit}
          onCancel={() => {
            setFormOpen(false);
            setError(null);
          }}
        />
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {completion ? (
            <Button
              variant="ghost"
              onClick={() => {
                setJustSaved(false);
                setFormOpen(true);
              }}
            >
              {t("editReflection")}
            </Button>
          ) : (
            <>
              {!started && <Button onClick={onStart}>{t("start")}</Button>}
              <Button
                variant={started ? "primary" : "ghost"}
                onClick={() => {
                  setJustSaved(false);
                  setFormOpen(true);
                }}
              >
                {t("markDone")}
              </Button>
              {started && (
                <button type="button" onClick={onUnstart} className="min-h-11 text-sm text-muted underline-offset-4 hover:underline">
                  {t("stopStart")}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
