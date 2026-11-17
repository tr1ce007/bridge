"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { importGuestData, type ImportSummary } from "@/lib/auth/guest-import";
import { getUserStore } from "@/lib/data";
import { createLocalUserStore } from "@/lib/data/local-store";
import { markImportDone } from "./import-flag";

/**
 * The explicit "move my data" step. Nothing is copied until the person presses the button.
 * `userId` only keys the "already done" flag so the offer is not repeated.
 */
export function GuestImportCard({ userId, onFinished, className }: { userId: string; onFinished?: () => void; className?: string }) {
  const t = useTranslations("auth.import");
  const [state, setState] = useState<{ status: "idle" | "busy" | "failed" } | { status: "done"; summary: ImportSummary }>({ status: "idle" });

  async function run() {
    setState({ status: "busy" });
    try {
      // `getUserStore()` is the account store while signed in; the device store is read directly.
      const summary = await importGuestData(createLocalUserStore(), getUserStore());
      markImportDone(userId);
      setState({ status: "done", summary });
    } catch {
      setState({ status: "failed" });
    }
  }

  const nothingNew =
    state.status === "done" &&
    !state.summary.session &&
    !state.summary.roadmap &&
    state.summary.reports + state.summary.journal + state.summary.saved + state.summary.completions === 0;

  return (
    <section aria-labelledby="import-title" className={className ?? "rounded-3xl border border-accent/40 bg-card p-5 sm:p-6"}>
      <h2 id="import-title" className="font-display text-lg font-semibold tracking-tight">
        {t("title")}
      </h2>
      {state.status !== "done" && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t("text")}</p>}

      {state.status === "done" && (
        <p role="status" className="mt-2 max-w-2xl text-sm leading-relaxed">
          {nothingNew ? t("doneNothing") : t("done", { reports: state.summary.reports, journal: state.summary.journal, saved: state.summary.saved, completions: state.summary.completions })}
        </p>
      )}
      {state.status === "failed" && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-400">
          {t("failed")}
        </p>
      )}

      {state.status !== "done" ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={run} disabled={state.status === "busy"}>
            {state.status === "busy" ? t("busy") : t("button")}
          </Button>
          {onFinished && (
            <Button variant="ghost" onClick={onFinished} disabled={state.status === "busy"}>
              {t("later")}
            </Button>
          )}
        </div>
      ) : (
        onFinished && (
          <Button variant="ghost" className="mt-4" onClick={onFinished}>
            {t("dismiss")}
          </Button>
        )
      )}
    </section>
  );
}
