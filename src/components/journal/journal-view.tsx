"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Container } from "@/components/ui/container";
import { useLoad } from "@/hooks/use-user-data";
import { newId } from "@/lib/chat/ids";
import { getUserStore, JOURNAL_FIELDS, JOURNAL_FIELD_MAX, storageMode, type JournalEntry, type JournalField } from "@/lib/data";
import { dataLocation, type DataLocation } from "@/lib/data/mode";
import { journalDraft, journalFilledFields, journalIsEmpty } from "@/lib/dashboard/journal";

type Draft = Record<JournalField, string>;
const emptyDraft = (): Draft => ({ tried: "", learned: "", surprised: "", disliked: "", next: "" });

async function loadJournal(): Promise<{ entries: JournalEntry[]; where: DataLocation }> {
  const [entries, where] = await Promise.all([getUserStore().listJournal(), dataLocation()]);
  return { entries, where };
}

/** /journal: private reflection entries with five optional prompts. Create, edit, delete (with confirmation). */
export function JournalView() {
  const t = useTranslations("journal");
  const { state, reload } = useLoad(loadJournal);

  if (state.status === "loading") {
    return (
      <Container className="py-16 text-center">
        <p role="status" className="text-muted">
          {t("loading")}
        </p>
      </Container>
    );
  }
  if (state.status === "error") {
    return (
      <Container className="py-16">
        <div role="alert" className="max-w-xl">
          <h2 className="font-display text-2xl font-semibold">{t("loadFailedTitle")}</h2>
          <p className="mt-3 text-muted">{t("loadFailed")}</p>
          <Button className="mt-6" onClick={reload}>
            {t("retry")}
          </Button>
        </div>
      </Container>
    );
  }
  return <JournalBody initial={state.data.entries} where={state.data.where} />;
}

function JournalBody({ initial, where }: { initial: JournalEntry[]; where: DataLocation }) {
  const t = useTranslations("journal");
  const tStates = useTranslations("states");
  const format = useFormatter();
  const [entries, setEntries] = useState<JournalEntry[]>(initial);
  /** null = form closed; "new" = writing a new entry; otherwise the id being edited. */
  const [editing, setEditing] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<JournalEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"save" | "delete" | null>(null);
  const [memory] = useState(() => storageMode() === "memory");
  const formRef = useRef<HTMLFormElement>(null);

  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "long" });

  async function save(entry: JournalEntry) {
    setBusy(true);
    setError(null);
    try {
      await getUserStore().saveJournal(entry);
      setEntries((prev) => {
        const next = prev.some((e) => e.id === entry.id) ? prev.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...prev];
        return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
      setEditing(null);
    } catch {
      setError("save");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    setError(null);
    try {
      await getUserStore().deleteJournal(toDelete.id);
      setEntries((prev) => prev.filter((e) => e.id !== toDelete.id));
      setToDelete(null);
    } catch {
      setToDelete(null);
      setError("delete");
    } finally {
      setBusy(false);
    }
  }

  const editingEntry = editing && editing !== "new" ? entries.find((e) => e.id === editing) : undefined;

  return (
    <Container className="pb-20">
      <div className="grid gap-3 lg:max-w-3xl">
        <p className="rounded-2xl border border-border bg-card shadow-card p-4 text-sm leading-relaxed">
          <span aria-hidden="true" className="mr-2 text-accent">
            ◆
          </span>
          <strong>{t("privacyNote")}</strong> {where === "account" ? t("storedAccount") : t("storedLocal")}
        </p>
        {(memory || where === "memory") && (
          <p role="status" className="rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm text-amber-800 dark:text-amber-300">
            {tStates("memoryNotice")}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-2xl border border-red-600/40 bg-subtle p-4 text-sm text-red-700 dark:text-red-400">
            {error === "save" ? t("saveFailed") : t("deleteFailed")}
          </p>
        )}
      </div>

      {editing === null && (
        <div className="mt-6">
          <Button onClick={() => setEditing("new")}>{t("newEntry")}</Button>
        </div>
      )}

      {editing !== null && (
        <EntryForm
          key={editing}
          formRef={formRef}
          initial={editingEntry ? journalDraft(editingEntry).draft : emptyDraft()}
          busy={busy}
          isEdit={Boolean(editingEntry)}
          onCancel={() => setEditing(null)}
          onSave={(draft) => {
            const now = new Date().toISOString();
            const base: JournalEntry = editingEntry ?? { id: newId(), text: "", createdAt: now };
            const cleaned = Object.fromEntries(JOURNAL_FIELDS.map((f) => [f, draft[f].trim() || undefined]));
            // an old text-only entry was moved into the first field, so the old text is cleared
            const text = editingEntry && journalDraft(editingEntry).movedText ? "" : base.text;
            void save({ ...base, text, ...cleaned, ...(editingEntry ? { updatedAt: now } : {}) });
          }}
        />
      )}

      <section aria-label={t("listLabel")} className="mt-8">
        {entries.length === 0 ? (
          editing === null && (
            <div className="rounded-3xl border border-dashed border-border p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold">{t("emptyTitle")}</h2>
              <p className="mt-2 max-w-xl leading-relaxed text-muted">{t("emptyLead")}</p>
            </div>
          )
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => {
              const filled = journalFilledFields(entry);
              return (
                <li key={entry.id} className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold">
                      <time dateTime={entry.createdAt}>{date(entry.createdAt)}</time>
                    </h2>
                    {entry.updatedAt && <span className="text-xs text-muted">{t("edited", { date: date(entry.updatedAt) })}</span>}
                  </div>
                  <dl className="mt-4 space-y-3">
                    {filled.map(({ field, value }) => (
                      <div key={field}>
                        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t(`fields.${field}`)}</dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{value}</dd>
                      </div>
                    ))}
                    {entry.text.trim() && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("note")}</dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{entry.text}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-4 flex gap-1 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setEditing(entry.id);
                      }}
                      className="min-h-11 rounded-full px-3 text-sm font-semibold text-primary hover:underline dark:text-[var(--ring)]"
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(entry)}
                      className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted hover:text-red-600"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        title={t("deleteTitle")}
        description={t("deleteLead")}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </Container>
  );
}

function EntryForm({
  initial,
  busy,
  isEdit,
  onSave,
  onCancel,
  formRef,
}: {
  initial: Draft;
  busy: boolean;
  isEdit: boolean;
  onSave: (d: Draft) => void;
  onCancel: () => void;
  formRef: React.RefObject<HTMLFormElement | null>;
}) {
  const t = useTranslations("journal");
  const [draft, setDraft] = useState<Draft>(initial);
  const [touched, setTouched] = useState(false);
  const empty = journalIsEmpty({ text: "", ...draft });

  const firstRef = useCallback((el: HTMLTextAreaElement | null) => el?.focus(), []);
  useEffect(() => {
    formRef.current?.scrollIntoView({ block: "nearest" });
  }, [formRef]);

  return (
    <form
      ref={formRef}
      className="mt-6 rounded-3xl border border-border bg-card shadow-card p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!empty) onSave(draft);
      }}
    >
      <h2 className="font-display text-xl font-semibold">{isEdit ? t("formEditTitle") : t("formNewTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("formHint")}</p>
      <div className="mt-5 space-y-5">
        {JOURNAL_FIELDS.map((field, i) => (
          <div key={field}>
            <label htmlFor={`journal-${field}`} className="block text-sm font-semibold">
              {t(`fields.${field}`)}
            </label>
            <textarea
              id={`journal-${field}`}
              ref={i === 0 ? firstRef : undefined}
              value={draft[field]}
              onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
              maxLength={JOURNAL_FIELD_MAX}
              rows={3}
              className="mt-2 w-full resize-y rounded-2xl border border-border bg-bg p-3 text-[0.95rem] leading-relaxed"
            />
          </div>
        ))}
      </div>
      {touched && empty && (
        <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
          {t("errorEmpty")}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? t("saving") : t("save")}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
