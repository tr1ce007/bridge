"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLoad } from "@/hooks/use-user-data";
import { cn } from "@/lib/cn";
import { storageMode } from "@/lib/data";
import {
  MENTEE_TOPICS,
  clearMentorInterest,
  loadMentorInterest,
  saveMentorInterest,
  validateMentorInterest,
  type MentorInterest,
  type MentorInterestErrors,
  type MentorInterestForm,
} from "@/lib/mentors/interest";

const emptyForm = (): MentorInterestForm => ({ role: "mentee", topics: [], field: "", experience: "", note: "", contact: "" });

const inputClass =
  "mt-2 w-full rounded-2xl border border-border bg-bg p-3 text-[0.95rem] leading-relaxed";

/**
 * "Register interest" form. Until the database is connected the answer stays in this browser,
 * and the page says so plainly. No mentor profiles are shown anywhere.
 */
async function readInterest(): Promise<{ saved: MentorInterest | null; memory: boolean }> {
  // Local data is only readable in the browser, so it is read after mount.
  return { saved: loadMentorInterest(), memory: storageMode() === "memory" };
}

export function InterestForm() {
  const t = useTranslations("mentors");
  const { state } = useLoad(readInterest);
  if (state.status === "loading") {
    return (
      <p role="status" className="text-muted">
        {t("loading")}
      </p>
    );
  }
  const data = state.status === "ready" ? state.data : { saved: null, memory: false };
  return <InterestBody initial={data.saved} memory={data.memory} />;
}

function InterestBody({ initial, memory }: { initial: MentorInterest | null; memory: boolean }) {
  const t = useTranslations("mentors");
  const tStates = useTranslations("states");
  const format = useFormatter();
  const [saved, setSaved] = useState<MentorInterest | null>(initial);
  const [form, setForm] = useState<MentorInterestForm>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateMentorInterest(form)).length) return;
    try {
      setSaved(saveMentorInterest(form));
      setFailed(false);
      setEditing(false);
    } catch {
      setFailed(true);
    }
  }

  function startEdit() {
    if (saved) setForm({ role: saved.role, topics: saved.topics, field: saved.field, experience: saved.experience, note: saved.note, contact: saved.contact });
    setSubmitted(false);
    setEditing(true);
  }

  if (saved && !editing) {
    return (
      <div className="rounded-3xl border border-border bg-card shadow-card p-6 sm:p-7">
        <div role="status" className="rounded-2xl bg-subtle p-4">
          <p className="font-semibold">{t("thanks")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("localOnly")}</p>
        </div>
        {memory && <p className="mt-3 text-sm text-accent-text">{tStates("memoryNotice")}</p>}
        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("summaryRole")}</dt>
            <dd className="mt-1">{saved.role === "mentee" ? t("roleMentee") : t("roleMentor")}</dd>
          </div>
          {saved.role === "mentee" ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("topicsLabel")}</dt>
              <dd className="mt-1">{saved.topics.map((topic) => t(`topics.${topic}`)).join(", ")}</dd>
            </div>
          ) : (
            <>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("fieldLabel")}</dt>
                <dd className="mt-1 break-words">{saved.field}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("experienceLabel")}</dt>
                <dd className="mt-1 break-words">{saved.experience}</dd>
              </div>
            </>
          )}
          {saved.note && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("noteLabel")}</dt>
              <dd className="mt-1 break-words whitespace-pre-wrap">{saved.note}</dd>
            </div>
          )}
          <div className="text-xs text-muted">{t("savedOn", { date: format.dateTime(new Date(saved.createdAt), { dateStyle: "long" }) })}</div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={startEdit}>
            {t("edit")}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmRemove(true)}>
            {t("remove")}
          </Button>
        </div>
        <ConfirmDialog
          open={confirmRemove}
          title={t("removeTitle")}
          description={t("removeLead")}
          confirmLabel={t("removeConfirm")}
          cancelLabel={t("cancel")}
          onConfirm={() => {
            clearMentorInterest();
            setSaved(null);
            setForm(emptyForm());
            setConfirmRemove(false);
          }}
          onCancel={() => setConfirmRemove(false)}
        />
      </div>
    );
  }

  // Errors show after the first submit and then follow the form, so they disappear once fixed.
  const errors: MentorInterestErrors = submitted ? validateMentorInterest(form) : {};
  const mentee = form.role === "mentee";
  return (
    <form onSubmit={submit} noValidate className="rounded-3xl border border-border bg-card shadow-card p-6 sm:p-7">
      <fieldset>
        <legend className="font-display text-lg font-semibold">{t("roleLegend")}</legend>
        <div role="radiogroup" className="mt-3 grid gap-2 sm:grid-cols-2">
          {(["mentee", "mentor"] as const).map((role) => (
            <label
              key={role}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--ring)]",
                form.role === role ? "border-primary bg-primary/10 font-semibold" : "border-border transition-colors hover:border-primary/40 hover:bg-primary-soft/50",
              )}
            >
              <input type="radio" name="role" value={role} checked={form.role === role} onChange={() => setForm((f) => ({ ...f, role }))} className="size-4 accent-[var(--primary)]" />
              {role === "mentee" ? t("roleMentee") : t("roleMentor")}
            </label>
          ))}
        </div>
      </fieldset>

      {mentee ? (
        <fieldset className="mt-6" aria-describedby={errors.topics ? "topics-error" : undefined}>
          <legend className="text-sm font-semibold">{t("topicsLabel")}</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {MENTEE_TOPICS.map((topic) => (
              <label key={topic} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-border px-4 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary-soft/50">
                <input
                  type="checkbox"
                  checked={form.topics.includes(topic)}
                  onChange={(e) => setForm((f) => ({ ...f, topics: e.target.checked ? [...f.topics, topic] : f.topics.filter((x) => x !== topic) }))}
                  className="size-4 accent-[var(--primary)]"
                />
                {t(`topics.${topic}`)}
              </label>
            ))}
          </div>
          {errors.topics && (
            <p id="topics-error" role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
              {t("errorTopics")}
            </p>
          )}
        </fieldset>
      ) : (
        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="mentor-field" className="block text-sm font-semibold">
              {t("fieldLabel")}
            </label>
            <input id="mentor-field" value={form.field} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, field: e.target.value }))} aria-invalid={Boolean(errors.field)} className={inputClass} />
            {errors.field && (
              <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
                {t("errorField")}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="mentor-exp" className="block text-sm font-semibold">
              {t("experienceLabel")}
            </label>
            <textarea id="mentor-exp" value={form.experience} maxLength={600} rows={3} onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))} aria-invalid={Boolean(errors.experience)} className={inputClass} />
            {errors.experience && (
              <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
                {t("errorExperience")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-5">
        <label htmlFor="mentor-note" className="block text-sm font-semibold">
          {t("noteLabel")}
        </label>
        <textarea id="mentor-note" value={form.note} maxLength={600} rows={3} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className={inputClass} />
      </div>
      <div className="mt-5">
        <label htmlFor="mentor-contact" className="block text-sm font-semibold">
          {t("contactLabel")}
        </label>
        <input id="mentor-contact" value={form.contact} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} aria-describedby="contact-hint" className={inputClass} />
        <p id="contact-hint" className="mt-1 text-xs text-muted">
          {t("contactHint")}
        </p>
      </div>

      <p className="mt-5 rounded-2xl bg-subtle p-4 text-sm leading-relaxed text-muted">{t("localOnly")}</p>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {t("saveFailed")}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="submit">{t("submit")}</Button>
        {editing && (
          <Button variant="ghost" onClick={() => setEditing(false)}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
