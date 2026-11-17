"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/data";
import { REPORT_REASONS } from "@/lib/stories/report-reasons";

type Phase = "closed" | "open" | "sending" | "sent" | "local" | "error";

/**
 * "Report this story": a small form that POSTs to /api/stories/report.
 * Without a database (local mode) it says so instead of pretending the report was filed.
 */
export function ReportStory({ storyId }: { storyId: string }) {
  const t = useTranslations("stories");
  const locale = useLocale();
  const uid = useId();
  const [phase, setPhase] = useState<Phase>("closed");
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setPhase("sending");
    try {
      const res = await fetch("/api/stories/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storyId, reason, details: details.trim() || undefined, locale }),
      });
      if (res.status === 201) return setPhase("sent");
      if (res.status === 503) return setPhase("local");
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage(json?.error ?? t("reportFailed"));
      setPhase("error");
    } catch {
      setMessage(t("reportFailed"));
      setPhase("error");
    }
  }

  if (phase === "closed") {
    return (
      <button type="button" onClick={() => setPhase(isSupabaseConfigured() ? "open" : "local")} className="min-h-11 text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline">
        {t("reportButton")}
      </button>
    );
  }
  if (phase === "sent") {
    return (
      <p role="status" className="rounded-2xl bg-subtle p-4 text-sm">
        {t("reportSent")}
      </p>
    );
  }
  if (phase === "local") {
    return (
      <div role="status" className="rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed">
        <p>{t("reportLocal")}</p>
        <button type="button" onClick={() => setPhase("closed")} className="mt-2 min-h-11 font-semibold underline-offset-4 hover:underline">
          {t("reportCancel")}
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={send} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="font-display text-lg font-semibold">{t("reportTitle")}</h3>
      <p className="mt-1 text-sm text-muted">{t("reportLead")}</p>
      <label htmlFor={`${uid}-reason`} className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {t("reportReason")}
      </label>
      <select id={`${uid}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-card px-3 text-[15px]">
        {REPORT_REASONS.map((r) => (
          <option key={r} value={r}>
            {t(`reportReasons.${r}`)}
          </option>
        ))}
      </select>
      <label htmlFor={`${uid}-details`} className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {t("reportDetails")}
      </label>
      <textarea id={`${uid}-details`} rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} className="mt-1.5 block w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[15px]" />
      {phase === "error" && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {message}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit" disabled={phase === "sending"}>
          {phase === "sending" ? t("reportSending") : t("reportSend")}
        </Button>
        <Button variant="ghost" onClick={() => setPhase("closed")} disabled={phase === "sending"}>
          {t("reportCancel")}
        </Button>
      </div>
    </form>
  );
}
