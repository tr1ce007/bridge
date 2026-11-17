"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useRouter } from "@/i18n/navigation";
import { getUserStore, reportSchema, type Answer, type DiscoveryReport } from "@/lib/data";
import { canGenerateReport } from "@/lib/questionnaire/engine";
import { restoreSession } from "@/lib/questionnaire/session";

type State = { kind: "loading"; stage: number } | { kind: "error" };

const STAGES = ["stage1", "stage2", "stage3"] as const;
const STAGE_MS = 2200;

/**
 * /report/new: reads the saved questionnaire, asks /api/ai/report, saves the report and opens it.
 * Unfinished questionnaire -> back to /explore. Errors show a retry (answers stay saved).
 */
export function ReportGenerator() {
  const t = useTranslations("report");
  const locale = useLocale();
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading", stage: 0 });
  const started = useRef(false);

  const run = useCallback(async () => {
    setState({ kind: "loading", stage: 0 });
    const store = getUserStore();
    let answers: Answer[];
    try {
      const saved = await store.loadSession();
      answers = saved ? restoreSession(saved).answers : [];
    } catch {
      answers = [];
    }
    if (!canGenerateReport(answers).ok) {
      router.replace("/explore");
      return;
    }
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, locale }),
      });
      if (res.status === 422) {
        router.replace("/explore");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { report: unknown };
      const report: DiscoveryReport = reportSchema.parse(data.report);
      await store.saveReport(report);
      // The plan from the newest report becomes the working roadmap when none exists yet.
      try {
        const current = await store.getRoadmap();
        if (!current.d7.length && !current.d30.length && !current.d90.length) await store.saveRoadmap(report.roadmap);
      } catch {
        // not critical: the plan is also stored inside the report
      }
      router.replace(`/report/${encodeURIComponent(report.id)}`);
    } catch {
      setState({ kind: "error" });
    }
  }, [locale, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  // Calm, staged loading copy (it does not track real progress; the last stage stays until done).
  useEffect(() => {
    if (state.kind !== "loading" || state.stage >= STAGES.length - 1) return;
    const id = setTimeout(() => setState((s) => (s.kind === "loading" ? { kind: "loading", stage: s.stage + 1 } : s)), STAGE_MS);
    return () => clearTimeout(id);
  }, [state]);

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">{t("eyebrow")}</p>
        {state.kind === "loading" ? (
          <div role="status" aria-live="polite">
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t("loadingTitle")}</h1>
            <div className="relative mx-auto mt-10 h-1 w-48 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                initial={{ width: "8%" }}
                animate={{ width: `${((state.stage + 1) / STAGES.length) * 90}%` }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            </div>
            <ol className="mt-8 space-y-2 text-lg">
              {STAGES.map((key, i) => (
                <li key={key} className={i <= state.stage ? "text-fg" : "text-muted/50"}>
                  <AnimatePresence initial={false}>
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: i <= state.stage ? 1 : 0.5 }}>
                      {t(key)}
                    </motion.span>
                  </AnimatePresence>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm text-muted">{t("loadingNote")}</p>
          </div>
        ) : (
          <div role="alert">
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t("errorTitle")}</h1>
            <p className="mt-4 text-lg text-muted">{t("errorLead")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={() => void run()}>{t("retry")}</Button>
              <Button variant="ghost" href="/explore">
                {t("backToExplore")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
