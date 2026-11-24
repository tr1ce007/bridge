"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { TEAM_CONTACT } from "@/lib/contact";
import { AGE_RANGES, LOCALES, STORY_CATEGORIES, SUBMISSION_LIMITS, isSupabaseConfigured, type Locale } from "@/lib/data";
import { EMPTY_SUBMISSION, validateSubmission, type FieldProblem, type SubmissionErrors, type SubmissionField, type SubmissionForm } from "@/lib/stories/validate";

type Phase = "idle" | "sending" | "sent";

/** Top-to-bottom order of the fields, used to focus the first invalid one. */
const ORDER: SubmissionField[] = ["lang", "title", "intro", "before", "challenges", "actions", "turningPoint", "now", "advice", "category", "ageRange", "displayName", "consent"];

const inputClass =
  "mt-1.5 block w-full rounded-xl border bg-card px-3 py-2.5 text-[15px] leading-relaxed focus-visible:border-primary";

function Field({
  id,
  label,
  error,
  children,
  counter,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  counter?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-semibold leading-snug">
          {label}
        </label>
        {counter && <span className="shrink-0 text-xs text-muted tabular-nums">{counter}</span>}
      </div>
      {children}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** /stories/submit form: validated on the client and again on the server; honest when no database is connected. */
export function SubmitStoryForm() {
  const t = useTranslations("stories");
  const locale = useLocale() as Locale;
  const [values, setValues] = useState<SubmissionForm>(() => ({ ...EMPTY_SUBMISSION, lang: locale }));
  const [errors, setErrors] = useState<SubmissionErrors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [serverError, setServerError] = useState<{ message: string; code: string } | null>(null);
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const localMode = !isSupabaseConfigured();

  const set = <K extends SubmissionField>(key: K, value: SubmissionForm[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const problem = (p: FieldProblem | undefined): string | undefined => {
    switch (p) {
      case undefined:
        return undefined;
      case "tooShort":
        return t("errTooShort");
      case "tooLong":
        return t("errTooLong");
      case "invalid":
        return t("errInvalid");
      default:
        return t("errRequired");
    }
  };
  const fieldProps = (name: SubmissionField) => ({
    id: `sf-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `sf-${name}-err` : undefined,
  });
  const border = (name: SubmissionField) => (errors[name] ? "border-red-600/70" : "border-border");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const found = validateSubmission(values);
    setErrors(found);
    const first = ORDER.find((k) => found[k]);
    if (first) {
      requestAnimationFrame(() => document.getElementById(`sf-${first}`)?.focus());
      return;
    }
    setPhase("sending");
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lang: values.lang,
          title: values.title,
          intro: values.intro,
          before: values.before,
          challenges: values.challenges,
          actions: values.actions,
          turningPoint: values.turningPoint,
          now: values.now,
          advice: values.advice.trim() || undefined,
          category: values.category,
          ageRange: values.ageRange || undefined,
          anonymous: values.anonymous,
          displayName: values.anonymous ? undefined : values.displayName.trim(),
          consent: values.consent,
          locale,
        }),
      });
      if (res.status === 201) {
        setPhase("sent");
        return;
      }
      const json = (await res.json().catch(() => null)) as { error?: string; code?: string; fields?: unknown } | null;
      setServerError({ message: json?.error ?? t("errServer"), code: json?.code ?? "unknown" });
      // The server checks the text after removing markup: a field that was only markup is marked here too.
      if (res.status === 400 && Array.isArray(json?.fields)) {
        const bad = ORDER.filter((k) => (json.fields as unknown[]).includes(k));
        if (bad.length) {
          setErrors(Object.fromEntries(bad.map((k) => [k, "invalid"])) as SubmissionErrors);
          requestAnimationFrame(() => document.getElementById(`sf-${bad[0]}`)?.focus());
        }
      }
    } catch {
      setServerError({ message: t("errNetwork"), code: "network" });
    }
    setPhase("idle");
  }

  async function copyText() {
    const parts: [string, string][] = [
      [t("formTitle"), values.title],
      [t("formIntro"), values.intro],
      [t("formBefore"), values.before],
      [t("formChallenges"), values.challenges],
      [t("formActions"), values.actions],
      [t("formTurningPoint"), values.turningPoint],
      [t("formNow"), values.now],
      [t("formAdvice"), values.advice],
    ];
    const text = parts
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}\n${v.trim()}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopy("done");
    } catch {
      setCopy("failed");
    }
  }

  if (phase === "sent") {
    return (
      <Container className="pb-24">
        <div role="status" className="max-w-2xl rounded-3xl border border-accent/40 bg-card p-6 sm:p-10">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance">{t("successTitle")}</h2>
          <p className="mt-3 text-lg leading-relaxed text-muted">{t("successLead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/stories">{t("successBack")}</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setValues({ ...EMPTY_SUBMISSION, lang: locale });
                setPhase("idle");
              }}
            >
              {t("successAnother")}
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  const longField = (name: "intro" | "before" | "challenges" | "actions" | "turningPoint" | "now" | "advice", label: string, max: number, rows = 4) => (
    <Field {...{ id: `sf-${name}`, label, error: problem(errors[name]), counter: t("formCounter", { count: values[name].length, max }) }}>
      <textarea
        {...fieldProps(name)}
        rows={rows}
        value={values[name]}
        onChange={(e) => set(name, e.target.value)}
        className={cn(inputClass, border(name))}
      />
    </Field>
  );

  return (
    <Container className="pb-24">
      <div className="max-w-2xl">
        {localMode && (
          <div role="note" className="mb-8 rounded-2xl border border-primary/20 bg-primary-soft p-4 sm:p-5">
            <p className="font-semibold text-accent-text">{t("submitLocalTitle")}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t("submitLocalLead")}</p>
          </div>
        )}

        <form onSubmit={submit} noValidate className="space-y-7">
          <Field id="sf-lang" label={t("formLang")}>
            <select {...fieldProps("lang")} value={values.lang} onChange={(e) => set("lang", e.target.value as Locale)} className={cn(inputClass, "min-h-11", border("lang"))}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {t(`langName.${l}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field id="sf-title" label={t("formTitle")} error={problem(errors.title)} counter={t("formCounter", { count: values.title.length, max: SUBMISSION_LIMITS.title })}>
            <input {...fieldProps("title")} type="text" value={values.title} onChange={(e) => set("title", e.target.value)} className={cn(inputClass, "min-h-11", border("title"))} />
          </Field>

          {longField("intro", t("formIntro"), SUBMISSION_LIMITS.intro, 3)}
          {longField("before", t("formBefore"), SUBMISSION_LIMITS.section)}
          {longField("challenges", t("formChallenges"), SUBMISSION_LIMITS.section)}
          {longField("actions", t("formActions"), SUBMISSION_LIMITS.section)}
          {longField("turningPoint", t("formTurningPoint"), SUBMISSION_LIMITS.section)}
          {longField("now", t("formNow"), SUBMISSION_LIMITS.section)}
          {longField("advice", t("formAdvice"), SUBMISSION_LIMITS.advice, 3)}

          <p className="text-sm leading-relaxed text-muted">{t("formPrivacy")}</p>

          <Field id="sf-category" label={t("formCategory")} error={problem(errors.category)}>
            <select {...fieldProps("category")} value={values.category} onChange={(e) => set("category", e.target.value)} className={cn(inputClass, "min-h-11", border("category"))}>
              <option value="">{t("formCategoryPlaceholder")}</option>
              {STORY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field id="sf-ageRange" label={t("formAge")}>
            <select {...fieldProps("ageRange")} value={values.ageRange} onChange={(e) => set("ageRange", e.target.value)} className={cn(inputClass, "min-h-11", border("ageRange"))}>
              <option value="">{t("formAgeNone")}</option>
              {AGE_RANGES.map((a) => (
                <option key={a} value={a}>
                  {t(`ageRanges.${a}`)}
                </option>
              ))}
            </select>
          </Field>

          <div className="rounded-2xl border border-border bg-card shadow-card p-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-semibold">
              <input type="checkbox" checked={values.anonymous} onChange={(e) => set("anonymous", e.target.checked)} className="size-5 shrink-0 accent-[var(--primary)]" />
              {t("formAnonymous")}
            </label>
            {!values.anonymous && (
              <div className="mt-3">
                <Field id="sf-displayName" label={t("formDisplayName")} error={problem(errors.displayName)} counter={t("formCounter", { count: values.displayName.length, max: SUBMISSION_LIMITS.displayName })}>
                  <input {...fieldProps("displayName")} type="text" value={values.displayName} maxLength={SUBMISSION_LIMITS.displayName + 20} onChange={(e) => set("displayName", e.target.value)} className={cn(inputClass, "min-h-11", border("displayName"))} />
                </Field>
                <p className="mt-1.5 text-sm text-muted">{t("formDisplayNameHelp")}</p>
              </div>
            )}
          </div>

          <div>
            <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-4 text-[15px] leading-snug", errors.consent ? "border-red-600/70" : "border-border")}>
              <input
                id="sf-consent"
                type="checkbox"
                checked={values.consent}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? "sf-consent-err" : undefined}
                onChange={(e) => set("consent", e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
              />
              <span>{t("formConsent")}</span>
            </label>
            {errors.consent && (
              <p id="sf-consent-err" role="alert" className="mt-1.5 text-sm text-red-700 dark:text-red-400">
                {t("errConsent")}
              </p>
            )}
          </div>

          {Object.values(errors).some(Boolean) && (
            <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
              {t("errForm")}
            </p>
          )}

          {serverError && (
            <div role="alert" className="rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed">
              <p className="font-semibold">{serverError.message}</p>
              {serverError.code === "sign_in_required" && (
                <p className="mt-1 text-muted">
                  {t("signInHint")}{" "}
                  <Link href="/auth" className="font-semibold text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]">
                    {t("signInLink")}
                  </Link>
                </p>
              )}
              {(serverError.code === "local_mode" || serverError.code === "sign_in_required") && <p className="mt-1 text-muted">{t("copyTitle")}</p>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={phase === "sending"}>
              {phase === "sending" ? t("formSubmitting") : t("formSubmit")}
            </Button>
            <Button variant="ghost" onClick={copyText}>
              {t("copyButton")}
            </Button>
            {localMode && (
              <a href={TEAM_CONTACT.instagramDmHref} target="_blank" rel="noopener noreferrer" className={buttonClasses("ghost")}>
                {t("sendInstagram")}
              </a>
            )}
            <span role="status" aria-live="polite" className="text-sm text-muted">
              {copy === "done" ? t("copied") : copy === "failed" ? t("copyFailed") : ""}
            </span>
          </div>
        </form>
      </div>
    </Container>
  );
}
