"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useLoad } from "@/hooks/use-user-data";
import { cn } from "@/lib/cn";
import { getUserStore, type Answer, type DiscoveryReport, type Locale } from "@/lib/data";
import { loadWorkingRoadmap, saveWorkingRoadmap } from "@/lib/dashboard/roadmap";
import { restoreSession } from "@/lib/questionnaire/session";
import { buildDirectionOptions, type DirectionOption } from "@/lib/whatif/options";
import { appendScenarioToRoadmap, scenarioRoadmapItems } from "@/lib/whatif/roadmap";
import { WHATIF_PERIODS, whatIfSchema, type WhatIfScenario } from "@/lib/whatif/schema";
import { ScenarioView } from "./scenario-view";

const NOTE_MAX = 600;

interface Loaded {
  reports: DiscoveryReport[];
  answers: Answer[];
  /** Direction id from `?d=` (the link on a report's direction card). */
  preselect: string | null;
}

async function loadWhatIf(): Promise<Loaded> {
  const store = getUserStore();
  const [reports, session] = await Promise.all([store.listReports(), store.loadSession().catch(() => null)]);
  const preselect = new URLSearchParams(window.location.search).get("d");
  return { reports, answers: session ? restoreSession(session).answers : [], preselect };
}

type Result = { scenario: WhatIfScenario; demo: boolean; reason?: "not-configured" | "failed"; optionId: string };
type Phase = { kind: "idle" } | { kind: "loading" } | { kind: "error" } | { kind: "ready"; result: Result };

export function WhatIfView() {
  const t = useTranslations("whatIf");
  const { state, reload } = useLoad(loadWhatIf);

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
  return <WhatIfBody {...state.data} />;
}

function WhatIfBody({ reports, answers, preselect }: Loaded) {
  const t = useTranslations("whatIf");
  const tReport = useTranslations("report");
  const locale = useLocale() as Locale;
  const options = useMemo(() => buildDirectionOptions(reports, locale), [reports, locale]);
  const [selected, setSelected] = useState<string | null>(() => (preselect && options.some((o) => o.id === preselect) ? preselect : null));
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [saveState, setSaveState] = useState<{ kind: "idle" } | { kind: "saving" } | { kind: "saved"; added: number } | { kind: "error" }>({ kind: "idle" });
  const abort = useRef<AbortController | null>(null);

  const option = options.find((o) => o.id === selected);

  async function build(o: DirectionOption) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setPhase({ kind: "loading" });
    setSaveState({ kind: "idle" });
    try {
      const res = await fetch("/api/ai/what-if", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(58_000)]),
        body: JSON.stringify({
          locale,
          direction: { key: o.key, name: o.name, why: o.why, howToTest: o.howToTest, skills: o.skills, difficulties: o.difficulties },
          note: note.trim() || undefined,
          answers: answers.length ? answers : undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { scenario: unknown; demo?: boolean; fallbackReason?: "not-configured" | "failed" };
      const scenario = whatIfSchema.parse(data.scenario);
      setPhase({ kind: "ready", result: { scenario, demo: Boolean(data.demo), reason: data.fallbackReason, optionId: o.id } });
    } catch {
      if (!controller.signal.aborted) setPhase({ kind: "error" });
    }
  }

  async function addToRoadmap(scenario: WhatIfScenario) {
    setSaveState({ kind: "saving" });
    try {
      const store = getUserStore();
      const labels = Object.fromEntries(WHATIF_PERIODS.map((p) => [p, t(`period.${p}`)])) as Record<(typeof WHATIF_PERIODS)[number], string>;
      const current = await loadWorkingRoadmap(store);
      let n = 0;
      const stamp = Date.now().toString(36);
      const next = appendScenarioToRoadmap(current, scenarioRoadmapItems(scenario, labels), () => `rm-wi-${stamp}-${(n += 1)}`);
      const added = next.d30.length + next.d90.length - current.d30.length - current.d90.length;
      if (added > 0) await saveWorkingRoadmap(store, next);
      setSaveState({ kind: "saved", added });
    } catch {
      setSaveState({ kind: "error" });
    }
  }

  const grouped = options.some((o) => o.source === "report");

  return (
    <Container className="pb-20">
      <p className="max-w-3xl rounded-2xl border border-border bg-card shadow-card p-4 text-sm leading-relaxed">
        <span aria-hidden="true" className="mr-2 text-accent">
          ◆
        </span>
        <strong>{t("notForecast")}</strong> {t("notForecastLead")}
      </p>

      {!grouped && (
        <div className="mt-4 max-w-3xl rounded-2xl border border-dashed border-border p-4 text-sm leading-relaxed">
          <p className="text-muted">{t("noReports")}</p>
          <Button href="/explore" variant="ghost" className="mt-3">
            {t("ctaExplore")}
          </Button>
        </div>
      )}

      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (option) void build(option);
        }}
      >
        <fieldset>
          <legend className="font-display text-xl font-semibold">{t("pickTitle")}</legend>
          <p className="mt-1 text-sm text-muted">{grouped ? t("pickFromReports") : t("pickFromCatalogue")}</p>
          <div role="radiogroup" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((o) => {
              const active = o.id === selected;
              return (
                <label
                  key={o.id}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--ring)]",
                    active ? "border-primary bg-primary/10 font-semibold" : "border-border transition-colors hover:border-primary/40 hover:bg-primary-soft/50",
                  )}
                >
                  <input
                    type="radio"
                    name="direction"
                    value={o.id}
                    checked={active}
                    onChange={() => {
                      setSelected(o.id);
                      setPhase({ kind: "idle" });
                    }}
                    className="size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 break-words">{o.name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 max-w-3xl">
          <label htmlFor="whatif-note" className="block text-sm font-semibold">
            {t("noteLabel")}
          </label>
          <textarea
            id="whatif-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={NOTE_MAX}
            rows={3}
            placeholder={t("notePlaceholder")}
            className="mt-2 w-full resize-y rounded-2xl border border-border bg-bg p-3 text-[0.95rem] leading-relaxed"
          />
          <p className="mt-1 text-xs text-muted">{t("aiNote")}</p>
        </div>

        <div className="mt-6">
          <Button type="submit" disabled={!option || phase.kind === "loading"}>
            {phase.kind === "loading" ? t("building") : t("build")}
          </Button>
        </div>
      </form>

      <div aria-live="polite" className="mt-10">
        {phase.kind === "loading" && (
          <p role="status" className="text-muted">
            {t("buildingLead")}
          </p>
        )}
        {phase.kind === "error" && (
          <div role="alert" className="max-w-xl rounded-2xl border border-red-600/40 bg-subtle p-5">
            <h2 className="font-display text-lg font-semibold">{t("errorTitle")}</h2>
            <p className="mt-2 text-sm text-muted">{t("errorLead")}</p>
            {option && (
              <Button className="mt-4" onClick={() => void build(option)}>
                {t("retryBuild")}
              </Button>
            )}
          </div>
        )}
        {phase.kind === "ready" && (
          <section aria-labelledby="scenario-title">
            <h2 id="scenario-title" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("scenarioTitle", { direction: phase.result.scenario.direction })}
            </h2>
            <p className="mt-2 text-sm font-semibold text-accent-text">{t("notForecast")}</p>
            {phase.result.demo && (
              <div role="note" className="mt-4 max-w-3xl rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm leading-relaxed">
                <p className="font-semibold text-accent-text">{phase.result.reason === "failed" ? t("demoBannerFailed") : t("demoBanner")}</p>
                <p className="mt-1 text-muted">{phase.result.reason === "failed" ? t("demoBannerFailedLead") : t("demoBannerLead")}</p>
              </div>
            )}
            <div className="mt-6">
              <ScenarioView periods={phase.result.scenario.periods} />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3 print:hidden">
              <Button onClick={() => void addToRoadmap(phase.result.scenario)} disabled={saveState.kind === "saving" || saveState.kind === "saved"}>
                {saveState.kind === "saving" ? t("adding") : t("addToRoadmap")}
              </Button>
              <Button variant="ghost" onClick={() => window.print()}>
                {tReport("print")}
              </Button>
            </div>
            <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-muted">
              {saveState.kind === "saved" &&
                (saveState.added > 0 ? t("addedOk", { count: saveState.added }) : t("addedAlready"))}
              {saveState.kind === "error" && <span className="text-red-600">{t("addFailed")}</span>}
            </p>
            {saveState.kind === "saved" && (
              <Button href="/dashboard#roadmap" variant="ghost" className="mt-2">
                {t("openDashboard")}
              </Button>
            )}
          </section>
        )}
      </div>
    </Container>
  );
}
