"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Container } from "@/components/ui/container";
import { useLoad } from "@/hooks/use-user-data";
import { cn } from "@/lib/cn";
import { getUserStore } from "@/lib/data";
import { buildExportPayload, collectExportData, exportFileName } from "@/lib/data/export";
import { dataLocation, type DataLocation } from "@/lib/data/mode";

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <h2 id={`${id}-title`} className="font-display text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

async function readSettings(): Promise<{ memoryConsent: boolean; where: DataLocation }> {
  const store = getUserStore();
  const [prefs, where] = await Promise.all([store.getPreferences().catch(() => ({ memoryConsent: false })), dataLocation()]);
  return { memoryConsent: prefs.memoryConsent, where };
}

export function SettingsView() {
  const t = useTranslations("settings");
  const { state, reload } = useLoad(readSettings);
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
  return <SettingsBody initialConsent={state.data.memoryConsent} where={state.data.where} />;
}

function SettingsBody({ initialConsent, where }: { initialConsent: boolean; where: DataLocation }) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const [consent, setConsent] = useState(initialConsent);
  const [consentError, setConsentError] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [step, setStep] = useState<"closed" | "first" | "second">("closed");
  const [typed, setTyped] = useState("");
  const [deleteState, setDeleteState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const word = t("confirmWord");
  const matches = typed.trim().toLocaleUpperCase(locale) === word.toLocaleUpperCase(locale);

  const toggleConsent = useCallback(async () => {
    const next = !consent;
    setConsent(next);
    setConsentError(false);
    try {
      const store = getUserStore();
      await store.savePreferences({ memoryConsent: next });
      // Same rule as in the chat: turning memory off erases what was kept.
      if (!next) await store.clearConversations();
    } catch {
      setConsent(!next);
      setConsentError(true);
    }
  }, [consent]);

  async function exportData() {
    setExportState("busy");
    try {
      const now = new Date();
      const data = await collectExportData(getUserStore());
      const payload = buildExportPayload(data, { exportedAt: now, storage: where });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(now);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportState("done");
    } catch {
      setExportState("error");
    }
  }

  function closeDelete() {
    setStep("closed");
    setTyped("");
  }

  async function deleteEverything() {
    setDeleteState("busy");
    try {
      const store = getUserStore();
      await store.clearConversations();
      await store.clearAll();
      setConsent(false);
      setDeleteState("done");
      closeDelete();
    } catch {
      setDeleteState("error");
      closeDelete();
    }
  }

  return (
    <Container className="pb-20">
      <div className="grid max-w-3xl gap-4">
        <Card id="language" title={t("languageTitle")}>
          <LocaleSwitcher className="w-fit" />
        </Card>

        <Card id="theme" title={t("themeTitle")}>
          <div className="flex items-center gap-3">
            <ThemeToggle className="border border-border" />
            <p className="text-sm text-muted">{t("themeLead")}</p>
          </div>
        </Card>

        <Card id="memory" title={t("memoryTitle")}>
          <div className="flex items-start justify-between gap-4">
            <p id="memory-label" className="text-[0.95rem] font-semibold leading-snug">
              {t("memoryLabel")}
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={consent}
              aria-labelledby="memory-label"
              aria-describedby="memory-help"
              onClick={() => void toggleConsent()}
              className={cn("relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors", consent ? "border-primary bg-primary" : "border-border bg-subtle")}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0.5 left-0.5 size-5.5 rounded-full bg-bg shadow transition-transform motion-reduce:transition-none",
                  consent ? "translate-x-5 bg-primary-fg" : "translate-x-0 border border-border",
                )}
              />
            </button>
          </div>
          <p id="memory-help" className="mt-2 text-sm leading-relaxed text-muted">
            {consent ? t("memoryOn") : t("memoryOff")}
          </p>
          {consentError && (
            <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
              {t("memoryFailed")}
            </p>
          )}
        </Card>

        <Card id="storage" title={t("storageTitle")}>
          <p className="font-semibold">{t(`storage.${where}`)}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t(`storageLead.${where}`)}</p>
        </Card>

        <Card id="export" title={t("exportTitle")}>
          <p className="text-sm leading-relaxed text-muted">{t("exportLead")}</p>
          <Button className="mt-4" onClick={() => void exportData()} disabled={exportState === "busy"}>
            {exportState === "busy" ? t("exporting") : t("exportButton")}
          </Button>
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-muted">
            {exportState === "done" && t("exportDone")}
            {exportState === "error" && <span className="text-red-700 dark:text-red-400">{t("exportFailed")}</span>}
          </p>
        </Card>

        <Card id="delete" title={t("deleteTitle")}>
          {deleteState === "done" ? (
            <div role="status" className="rounded-2xl bg-subtle p-4">
              <p className="font-semibold">{t("deletedTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t("deletedLead")}</p>
              <Button href="/" variant="ghost" className="mt-4">
                {t("deletedHome")}
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted">{t("deleteLead")}</p>
              {where === "account" && (
                <p className="mt-3 rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed">{t("accountNote")}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setDeleteState("idle");
                  setStep("first");
                }}
                className="mt-4 inline-flex min-h-11 items-center rounded-full border border-red-700/60 px-6 text-sm font-semibold text-red-700 transition-colors hover:bg-red-700/10 dark:text-red-400"
              >
                {t("deleteButton")}
              </button>
              {deleteState === "error" && (
                <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
                  {t("deleteFailed")}
                </p>
              )}
            </>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={step === "first"}
        title={t("firstTitle")}
        description={t("firstLead")}
        confirmLabel={t("firstConfirm")}
        cancelLabel={t("cancel")}
        onConfirm={() => setStep("second")}
        onCancel={closeDelete}
      />
      <ConfirmDialog
        open={step === "second"}
        title={t("secondTitle")}
        description={t("secondLead", { word })}
        confirmLabel={t("secondConfirm")}
        cancelLabel={t("cancel")}
        confirmDisabled={!matches}
        busy={deleteState === "busy"}
        onConfirm={() => void deleteEverything()}
        onCancel={closeDelete}
      >
        <label htmlFor="delete-word" className="block text-sm font-semibold">
          {t("typeLabel", { word })}
        </label>
        <input
          id="delete-word"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="mt-2 min-h-11 w-full rounded-2xl border border-border bg-bg px-4 text-sm focus:outline-2 focus:outline-[var(--ring)]"
        />
      </ConfirmDialog>
    </Container>
  );
}
