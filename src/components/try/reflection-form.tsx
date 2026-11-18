"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PROCESS_ANSWERS, type ProcessAnswer } from "@/lib/data/types";
import { composeReflection } from "@/lib/experiments/reflection";

export interface ReflectionResult {
  answer: ProcessAnswer;
  rating: number;
  reflection: string;
}

const textarea =
  "mt-1.5 block w-full rounded-xl border border-border bg-card shadow-card px-3 py-2.5 text-[15px] leading-relaxed focus-visible:border-primary";

/** A group of big radio "pills" (native radios, so keyboard and screen readers work). */
function PillGroup({
  name,
  value,
  onChange,
  options,
  invalid,
  describedBy,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; short?: string }[];
  invalid: boolean;
  describedBy?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ring)]",
            value === o.value ? "border-primary bg-primary text-primary-fg" : "border-border transition-colors hover:border-primary/40 hover:bg-primary-soft/50 hover:bg-subtle",
            invalid && value === "" && "border-red-600/60",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            aria-describedby={describedBy}
            className="sr-only"
          />
          <span aria-hidden={o.short ? true : undefined}>{o.label}</span>
          {o.short && <span className="sr-only">{o.short}</span>}
        </label>
      ))}
    </div>
  );
}

/**
 * "I did it": the key question (3 answers), a 1–5 rating, the experiment's own reflection
 * questions (optional text) and an optional note. `questions` excludes the key question.
 */
export function ReflectionForm({
  questions,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  questions: string[];
  saving: boolean;
  error: string | null;
  onSubmit: (result: ReflectionResult) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("try");
  const uid = useId();
  const [answer, setAnswer] = useState("");
  const [rating, setRating] = useState("");
  const [texts, setTexts] = useState<string[]>(() => questions.map(() => ""));
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  const answerMissing = tried && !answer;
  const ratingMissing = tried && !rating;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!answer || !rating) return;
    onSubmit({
      answer: answer as ProcessAnswer,
      rating: Number(rating),
      reflection: composeReflection(
        questions.map((question, i) => ({ question, answer: texts[i] ?? "" })),
        note,
        t("noteLabel"),
      ),
    });
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-6 rounded-2xl border border-border bg-subtle p-4 sm:p-5">
      <div>
        <h4 className="font-display text-lg font-semibold">{t("formTitle")}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t("formLead")}</p>
      </div>

      <fieldset>
        <legend className="text-[15px] font-semibold leading-snug">{t("keyQuestion")}</legend>
        <PillGroup
          name={`${uid}-answer`}
          value={answer}
          onChange={setAnswer}
          invalid={answerMissing}
          describedBy={answerMissing ? `${uid}-answer-err` : undefined}
          options={PROCESS_ANSWERS.map((a) => ({ value: a, label: t(`answers.${a}`) }))}
        />
        {answerMissing && (
          <p id={`${uid}-answer-err`} role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
            {t("errorAnswer")}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="text-[15px] font-semibold leading-snug">{t("ratingLabel")}</legend>
        <PillGroup
          name={`${uid}-rating`}
          value={rating}
          onChange={setRating}
          invalid={ratingMissing}
          describedBy={ratingMissing ? `${uid}-rating-err` : undefined}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n), short: t("ratingOption", { n }) }))}
        />
        {ratingMissing && (
          <p id={`${uid}-rating-err`} role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
            {t("errorRating")}
          </p>
        )}
      </fieldset>

      {questions.length > 0 && (
        <fieldset>
          <legend className="text-sm font-semibold text-muted">{t("questionsTitle")}</legend>
          <div className="mt-3 space-y-4">
            {questions.map((q, i) => (
              <div key={i}>
                <label htmlFor={`${uid}-q${i}`} className="text-[15px] leading-snug">
                  {q}
                </label>
                <textarea
                  id={`${uid}-q${i}`}
                  rows={2}
                  maxLength={1000}
                  value={texts[i] ?? ""}
                  onChange={(e) => setTexts((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                  className={textarea}
                />
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor={`${uid}-note`} className="text-[15px] font-semibold">
          {t("noteLabel")}
        </label>
        <textarea
          id={`${uid}-note`}
          rows={3}
          maxLength={2000}
          value={note}
          placeholder={t("notePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
          className={textarea}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? t("saving") : t("saveReflection")}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
