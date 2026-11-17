"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { RoadmapEditor } from "@/components/report/roadmap-editor";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useLoad } from "@/hooks/use-user-data";
import { Link } from "@/i18n/navigation";
import { getUserStore, storageMode, type Locale, type Roadmap } from "@/lib/data";
import { pickText } from "@/lib/data/content-utils";
import { loadDashboard, type DashboardData } from "@/lib/dashboard/load";
import { nextSteps, type NextStep } from "@/lib/dashboard/next-steps";
import { recentOpportunities } from "@/lib/dashboard/opportunities";
import { saveWorkingRoadmap } from "@/lib/dashboard/roadmap";
import { resolveSavedDirections } from "@/lib/dashboard/saved-directions";
import { questionnaireProgress } from "@/lib/dashboard/state";
import { buildTimeline } from "@/lib/dashboard/timeline";
import { buildExperimentRelations } from "@/lib/experiments/relations";
import { rankExperiments } from "@/lib/experiments/rank";
import { localized } from "@/lib/localized";
import { EmptyNote, Panel } from "./panel";
import { TimelineList } from "./timeline-list";

const HORIZONS = ["d7", "d30", "d90"] as const;

export function DashboardView() {
  const t = useTranslations("dashboard");
  const load = useCallback(() => loadDashboard(getUserStore()), []);
  const { state, reload } = useLoad(load);

  if (state.status === "loading") {
    return (
      <Container className="py-24 text-center">
        <p role="status" className="text-muted">
          {t("loading")}
        </p>
      </Container>
    );
  }
  if (state.status === "error") {
    return (
      <Container className="py-24">
        <div role="alert" className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-2xl font-semibold">{t("errorTitle")}</h2>
          <p className="mt-3 text-muted">{t("errorLead")}</p>
          <Button className="mt-6" onClick={reload}>
            {t("retry")}
          </Button>
        </div>
      </Container>
    );
  }
  return <DashboardBody data={state.data} />;
}

function DashboardBody({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard");
  const tReport = useTranslations("report");
  const tTry = useTranslations("try");
  const tStates = useTranslations("states");
  const locale = useLocale() as Locale;
  const format = useFormatter();
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  const [roadmap, setRoadmap] = useState<Roadmap>(data.roadmap);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [now] = useState(() => new Date());

  const onRoadmap = useCallback((next: Roadmap) => {
    setRoadmap(next);
    // Saves run one after another, so an older save never overwrites a newer one.
    queue.current = queue.current
      .then(() => saveWorkingRoadmap(getUserStore(), next))
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("error"));
  }, []);

  const { state: qState, canGenerate } = useMemo(() => {
    const p = questionnaireProgress(data.session);
    return { state: p.state, canGenerate: p.canGenerate };
  }, [data.session]);

  const experimentTitle = useMemo(() => new Map(data.experiments.map((e) => [e.id, localized(e.title, locale)])), [data.experiments, locale]);

  const ranked = useMemo(() => {
    const relations = buildExperimentRelations(data.experiments);
    return rankExperiments(data.experiments, data.completions, relations).filter((r) => !r.completed);
  }, [data.experiments, data.completions]);

  const steps = useMemo(
    () =>
      nextSteps({
        questionnaire: qState,
        canGenerate,
        reportCount: data.reports.length,
        openRoadmapItems: HORIZONS.flatMap((h) => roadmap[h].filter((i) => !i.done).map((i) => ({ id: i.id, text: i.text, horizon: h }))),
        completedExperimentCount: data.completions.length,
        suggestedExperiments: ranked.map((r) => ({ id: r.experiment.id, title: localized(r.experiment.title, locale) })),
      }),
    [qState, canGenerate, data.reports.length, data.completions.length, roadmap, ranked, locale],
  );

  const timeline = useMemo(() => buildTimeline({ reports: data.reports, completions: data.completions, journal: data.journal }), [data]);
  const savedDirections = useMemo(() => resolveSavedDirections(data.savedDirectionIds, data.reports), [data.savedDirectionIds, data.reports]);
  const savedStories = useMemo(() => {
    const byId = new Map(data.stories.map((s) => [s.id, s]));
    return data.savedStoryIds.flatMap((id) => byId.get(id) ?? []);
  }, [data.stories, data.savedStoryIds]);
  const opps = useMemo(() => recentOpportunities(data.opportunities, data.savedOpportunityIds, now), [data.opportunities, data.savedOpportunityIds, now]);

  const firstVisit = data.reports.length === 0 && qState === "not-started" && data.journal.length === 0 && data.completions.length === 0;
  const hasRoadmap = HORIZONS.some((h) => roadmap[h].length > 0);
  const latest = data.reports[0];

  const stepText = (s: NextStep) => {
    switch (s.kind) {
      case "start-questionnaire":
        return t("stepStart");
      case "continue-questionnaire":
        return t("stepContinue");
      case "generate-report":
        return t("stepGenerate");
      case "roadmap-item":
        return s.text;
      case "try-experiment":
        return t("stepExperiment", { title: s.title });
      case "reflect":
        return t("stepReflect");
    }
  };
  const stepHref = (s: NextStep): string => {
    switch (s.kind) {
      case "start-questionnaire":
      case "continue-questionnaire":
        return "/explore";
      case "generate-report":
        return "/report/new";
      case "roadmap-item":
        return "#roadmap";
      case "try-experiment":
        return `/try#${s.id}`;
      case "reflect":
        return "/journal";
    }
  };

  return (
    <Container className="pb-20">
      <div className="grid gap-3 lg:max-w-3xl">
        {storageMode() === "memory" && (
          <p role="status" className="rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm text-amber-800 dark:text-amber-300">
            {tStates("memoryNotice")}
          </p>
        )}
        {data.partial && (
          <p role="status" className="rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm text-amber-800 dark:text-amber-300">
            {tStates("savedLoadFailed")}
          </p>
        )}
      </div>

      {firstVisit && (
        <div className="mt-6 rounded-3xl border border-border bg-subtle/60 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{t("firstTitle")}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">{t("firstLead")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/explore">{t("firstCta")}</Button>
            <Button variant="ghost" href="/chat">
              {t("firstChat")}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel id="progress" title={t("progressTitle")}>
          <p className="font-semibold">{t(`questionnaire.${qState}`)}</p>
          <p className="mt-1 text-sm text-muted">{t("reportCount", { count: data.reports.length })}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {qState !== "done" && !canGenerate && <Button href="/explore">{qState === "not-started" ? t("ctaStart") : t("ctaContinue")}</Button>}
            {qState === "done" || canGenerate ? (
              <Button href="/explore" variant="ghost">
                {t("ctaRetake")}
              </Button>
            ) : null}
            {latest && (
              <Button href={`/report/${encodeURIComponent(latest.id)}`} variant={qState !== "done" && !canGenerate ? "ghost" : "primary"}>
                {t("ctaOpenReport")}
              </Button>
            )}
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-4 text-sm">
            <li>
              <Link href="/journal" className="inline-flex min-h-9 items-center font-semibold text-primary hover:underline dark:text-[var(--ring)]">
                {t("linkJournal")}
              </Link>
            </li>
            <li>
              <Link href="/what-if" className="inline-flex min-h-9 items-center font-semibold text-primary hover:underline dark:text-[var(--ring)]">
                {t("linkWhatIf")}
              </Link>
            </li>
            <li>
              <Link href="/compare" className="inline-flex min-h-9 items-center font-semibold text-primary hover:underline dark:text-[var(--ring)]">
                {t("linkCompare")}
              </Link>
            </li>
            <li>
              <Link href="/mentors" className="inline-flex min-h-9 items-center font-semibold text-primary hover:underline dark:text-[var(--ring)]">
                {t("linkMentors")}
              </Link>
            </li>
          </ul>
        </Panel>

        <Panel id="next" title={t("nextTitle")} lead={t("nextLead")}>
          <ul className="space-y-2.5">
            {steps.map((s, i) => (
              <li key={`${s.kind}-${i}`} className="flex items-start gap-3 rounded-2xl bg-subtle px-4 py-3">
                <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0 flex-1">
                  {s.kind === "roadmap-item" && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tReport(s.horizon)}</p>}
                  <p className="text-sm leading-relaxed break-words">{stepText(s)}</p>
                </div>
                <Link
                  href={stepHref(s)}
                  className="inline-flex min-h-9 shrink-0 items-center text-sm font-semibold text-primary hover:underline dark:text-[var(--ring)]"
                >
                  {t(`stepGo.${s.kind}`)}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel id="roadmap" className="mt-4" title={t("roadmapTitle")} lead={t("roadmapLead")}>
        {hasRoadmap ? (
          <>
            <RoadmapEditor roadmap={roadmap} onChange={onRoadmap} />
            <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-muted">
              {saveState === "saved" ? tReport("saved") : saveState === "error" ? <span className="text-red-600">{tReport("saveFailed")}</span> : null}
            </p>
          </>
        ) : (
          <EmptyNote>{t("roadmapEmpty")}</EmptyNote>
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel id="saved-stories" title={t("savedStoriesTitle")} linkHref="/stories" linkLabel={t("allStories")}>
          {savedStories.length ? (
            <ul className="space-y-2">
              {savedStories.map((s) => (
                <li key={s.id}>
                  <Link href={`/stories/${s.id}`} className="block rounded-2xl border border-border px-4 py-3 text-sm font-semibold hover:border-fg/40">
                    {pickText(s.title, locale, s.lang)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{t("savedStoriesEmpty")}</EmptyNote>
          )}
        </Panel>

        <Panel id="saved-directions" title={t("savedDirectionsTitle")}>
          {savedDirections.length ? (
            <ul className="space-y-2">
              {savedDirections.map((d) => (
                <li key={d.id}>
                  <Link href={`/report/${encodeURIComponent(d.reportId)}`} className="block rounded-2xl border border-border px-4 py-3 hover:border-fg/40">
                    <span className="block text-sm font-semibold">{d.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">{t("fromReport", { date: date(d.reportDate) })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{t("savedDirectionsEmpty")}</EmptyNote>
          )}
        </Panel>

        <Panel id="experiments" title={t("experimentsTitle")} linkHref="/try" linkLabel={t("allExperiments")}>
          {data.completions.length ? (
            <ul className="space-y-2">
              {data.completions.map((c) => {
                const answer = c.answer ?? (c.enjoyedProcess ? "process" : null);
                return (
                  <li key={c.experimentId}>
                    <Link href={`/try#${c.experimentId}`} className="block rounded-2xl border border-border px-4 py-3 hover:border-fg/40">
                      <span className="block text-sm font-semibold">{experimentTitle.get(c.experimentId) ?? c.experimentId}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {date(c.completedAt)}
                        {answer ? ` · ${tTry("resultAnswer", { answer: tTry(`answers.${answer}`) })}` : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyNote>{t("experimentsEmpty")}</EmptyNote>
          )}
        </Panel>

        <Panel
          id="opportunities"
          title={t("opportunitiesTitle")}
          lead={opps.items.length ? (opps.source === "saved" ? t("opportunitiesSaved") : t("opportunitiesRecent")) : undefined}
          linkHref="/opportunities"
          linkLabel={t("allOpportunities")}
        >
          {opps.items.length ? (
            <ul className="space-y-2">
              {opps.items.map((o) => (
                <li key={o.id}>
                  <Link href="/opportunities" className="block rounded-2xl border border-border px-4 py-3 hover:border-fg/40">
                    <span className="block text-sm font-semibold">{o.name}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">{localized(o.description, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{t("opportunitiesEmpty")}</EmptyNote>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel id="reports" title={t("reportsTitle")}>
          {data.reports.length ? (
            <>
              <ul className="space-y-2">
                {data.reports.map((r, i) => (
                  <li key={r.id}>
                    <Link href={`/report/${encodeURIComponent(r.id)}`} className="block rounded-2xl border border-border px-4 py-3 hover:border-fg/40">
                      <span className="block text-sm font-semibold">
                        {date(r.createdAt)}
                        {i === 0 ? ` · ${t("latest")}` : ""}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">{r.directions.slice(0, 3).map((d) => d.name).join(" · ")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {data.reports.length > 1 && (
                <Button href="/compare" variant="ghost" className="mt-4">
                  {t("linkCompare")}
                </Button>
              )}
            </>
          ) : (
            <EmptyNote>{t("reportsEmpty")}</EmptyNote>
          )}
        </Panel>

        <Panel id="timeline" title={t("timelineTitle")} lead={t("timelineLead")}>
          {timeline.length ? <TimelineList events={timeline} experimentTitles={experimentTitle} /> : <EmptyNote>{t("timelineEmpty")}</EmptyNote>}
        </Panel>
      </div>
    </Container>
  );
}
