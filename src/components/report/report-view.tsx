"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { BridgeLine } from "@/components/bridge-line";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useSaved } from "@/hooks/use-saved";
import { Link } from "@/i18n/navigation";
import { directionSavedId } from "@/lib/dashboard/saved-directions";
import { getContent, getUserStore, storageMode, type DiscoveryReport, type Roadmap, type Story } from "@/lib/data";
import { DemoBanner } from "./demo-banner";
import { DirectionCard } from "./direction-card";
import { ReportSection } from "./report-section";
import { RoadmapEditor } from "./roadmap-editor";
import { StoryMatchCard } from "./story-match-card";

type Load =
  | { kind: "loading" }
  | { kind: "missing" }
  /** `latest`: this is the newest report, whose plan is also the working roadmap (dashboard). */
  | { kind: "ready"; report: DiscoveryReport; stories: Map<string, Story>; latest: boolean };

const SECTIONS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item, i) => (
        <li key={i} className="rounded-2xl border border-border bg-card shadow-card p-5 text-[0.95rem] leading-relaxed text-pretty">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** /report/[id]: the Discovery Report from the user store, all 8 sections, editable plan. */
export function ReportView({ id }: { id: string }) {
  const t = useTranslations("report");
  const format = useFormatter();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [memory, setMemory] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const savedDirections = useSaved("direction");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let report: DiscoveryReport | undefined;
      let latest = false;
      try {
        const reports = await getUserStore().listReports(); // newest first
        report = reports.find((r) => r.id === id);
        latest = reports[0]?.id === id;
      } catch {
        report = undefined;
      }
      if (cancelled) return;
      setMemory(storageMode() === "memory");
      if (!report) return setLoad({ kind: "missing" });
      const stories = new Map<string, Story>();
      try {
        for (const s of await getContent().listStories()) stories.set(s.id, s);
      } catch {
        // story cards are skipped when content cannot be loaded
      }
      if (!cancelled) setLoad({ kind: "ready", report, stories, latest });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const saveRoadmap = useCallback(
    (roadmap: Roadmap) => {
      if (load.kind !== "ready") return;
      const report = { ...load.report, roadmap };
      setLoad({ ...load, report });
      // Side effects stay outside the state updater. Saves are queued so an older save never
      // overwrites a newer one. Only the newest report's plan replaces the working roadmap.
      const store = getUserStore();
      const latest = load.latest;
      queue.current = queue.current
        .then(() => Promise.all([store.saveReport(report), latest ? store.saveRoadmap(roadmap) : undefined]))
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    },
    [load],
  );

  if (load.kind === "loading") {
    return (
      <Container className="py-24 text-center">
        <p role="status" className="text-muted">
          {t("loadingReport")}
        </p>
      </Container>
    );
  }

  if (load.kind === "missing") {
    return (
      <Container className="py-24">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t("notFoundTitle")}</h1>
          <p className="mt-4 text-lg text-muted">{t("notFoundLead")}</p>
          <div className="mt-8">
            <Button href="/explore">{t("ctaExplore")}</Button>
          </div>
        </div>
      </Container>
    );
  }

  const { report, stories } = load;
  const matched = report.stories.flatMap((m) => {
    const story = stories.get(m.storyId);
    return story ? [{ m, story }] : [];
  });

  return (
    <article className="pb-20 print:pb-0">
      {/* Hero */}
      <header className="relative isolate overflow-hidden border-b border-border bg-gradient-to-b from-bg to-primary-soft/50 print:bg-transparent">
        <div aria-hidden="true" className="blueprint absolute inset-0 -z-10 print:hidden" />
        <Container className="pt-12 pb-10 sm:pt-20 sm:pb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">{t("eyebrow")}</p>
          <h1 className="mt-4 max-w-3xl font-display text-[2.25rem] leading-[1.05] font-bold tracking-[-0.035em] text-balance sm:text-6xl">{t("title")}</h1>
          <p className="mt-4 text-sm text-muted">{t("createdAt", { date: format.dateTime(new Date(report.createdAt), { dateStyle: "long" }) })}</p>
          <div className="mt-8 grid gap-3 lg:max-w-3xl">
            {report.demo && <DemoBanner reason={report.demoReason} />}
            {memory && (
              <p role="status" className="rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm text-amber-800 dark:text-amber-300">
                {t("memoryNotice")}
              </p>
            )}
            <p className="rounded-2xl border border-border bg-card shadow-card p-4 text-sm leading-relaxed">
              <span aria-hidden="true" className="mr-2 text-accent">◆</span>
              {t("explorationNote")}
            </p>
          </div>
          <nav aria-label={t("contents")} className="mt-10 print:hidden">
            <ol className="flex gap-2 overflow-x-auto pb-2 text-sm [scrollbar-width:none]">
              {SECTIONS.map((s, i) => (
                <li key={s} className="shrink-0">
                  <a href={`#${s}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card shadow-card px-3 transition-colors hover:border-primary/40 hover:bg-primary-soft/50">
                    <span className="font-semibold text-accent-text">{i + 1}</span> {t(s)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </Container>
      </header>

      <Container>
        <ReportSection id="s1" index={1} title={t("s1")}>
          <p className="max-w-3xl font-display text-xl leading-relaxed tracking-tight text-pretty sm:text-2xl sm:leading-relaxed">{report.startingPoint}</p>
        </ReportSection>

        <ReportSection id="s2" index={2} title={t("s2")}>
          <Bullets items={report.patterns} />
        </ReportSection>

        <ReportSection id="s3" index={3} title={t("s3")}>
          <Bullets items={report.unnoticed} />
        </ReportSection>

        <ReportSection id="s4" index={4} title={t("s4")} lead={t("s4Lead")}>
          <ul className="grid gap-4 lg:grid-cols-2">
            {report.directions.map((d, i) => (
              <li key={`${d.name}-${i}`}>
                <DirectionCard
                  direction={d}
                  index={i}
                  saved={savedDirections.ids.includes(directionSavedId(report.id, i))}
                  onToggleSaved={savedDirections.status === "ready" ? () => void savedDirections.toggle(directionSavedId(report.id, i)) : undefined}
                  whatIfHref={`/what-if?d=${encodeURIComponent(directionSavedId(report.id, i))}`}
                />
              </li>
            ))}
          </ul>
          {savedDirections.saveFailed && (
            <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
              {t("saveFailed")}
            </p>
          )}
        </ReportSection>

        <ReportSection id="s5" index={5} title={t("s5")} lead={t("s5Lead")}>
          {matched.length ? (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {matched.map(({ m, story }) => (
                <li key={m.storyId}>
                  <StoryMatchCard match={m} story={story} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{t("s5Empty")}</p>
          )}
        </ReportSection>

        <ReportSection id="s6" index={6} title={t("s6")}>
          <ul className="grid gap-4 md:grid-cols-2">
            {report.unexpected.map((u, i) => (
              <li key={i} className="rounded-3xl border border-dashed border-accent/60 p-6">
                <h3 className="font-display text-lg font-semibold">{u.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{u.why}</p>
              </li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection id="s7" index={7} title={t("s7")} lead={t("s7Lead")}>
          <ul className="grid gap-4 md:grid-cols-2">
            {report.experiments.map((e, i) => (
              <li key={i} className="flex flex-col rounded-3xl border border-border bg-card shadow-card p-6">
                <h3 className="font-display text-lg font-semibold">{e.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{e.description}</p>
                <div className="mt-auto pt-4 print:hidden">
                  <Link
                    href={e.experimentId ? `/try#${e.experimentId}` : "/try"}
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline dark:text-[var(--ring)]"
                  >
                    {t("tryCta")} <span aria-hidden="true">&nbsp;→</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 print:hidden">
            <Button variant="ghost" href="/try">
              {t("allExperiments")}
            </Button>
          </div>
        </ReportSection>

        <ReportSection id="s8" index={8} title={t("s8")} lead={t("s8Lead")}>
          <RoadmapEditor roadmap={report.roadmap} onChange={saveRoadmap} />
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-muted">
            {saveState === "saved" ? t("saved") : saveState === "error" ? <span className="text-red-600">{t("saveFailed")}</span> : null}
          </p>
        </ReportSection>
      </Container>

      <BridgeLine className="mt-4 print:hidden" />
      <Container className="mt-8 flex flex-wrap gap-3 print:hidden">
        <Button variant="ghost" onClick={() => window.print()}>
          {t("print")}
        </Button>
        <Button variant="ghost" href="/explore">
          {t("newReport")}
        </Button>
      </Container>
    </article>
  );
}
