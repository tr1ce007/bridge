"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { cn } from "@/lib/cn";
import { getUserStore, storageMode, type ExperimentCompletion, type Locale } from "@/lib/data";
import { DIRECTION_LABELS, DIRECTIONS, type DirectionSlug } from "@/lib/data/directions";
import { listStarted, markStarted, unmarkStarted } from "@/lib/experiments/progress";
import { likedExperiments, rankExperiments } from "@/lib/experiments/rank";
import type { ExperimentRelations } from "@/lib/experiments/relations";
import type { ExperimentView } from "@/lib/experiments/view";
import { localized } from "@/lib/localized";
import { ExperimentCard } from "./experiment-card";
import type { ReflectionResult } from "./reflection-form";

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
function readHash(): string {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return "";
  }
}
/** The `#id` of the URL (deep links like /try#exp-psychology-diary), "" on the server. */
function useHashId(): string {
  return useSyncExternalStore(subscribeHash, readHash, () => "");
}

/** /try body: direction filter, ranked experiment cards, "similar experiments" hint, saved state. */
export function ExperimentsExplorer({ experiments, relations }: { experiments: ExperimentView[]; relations: ExperimentRelations }) {
  const t = useTranslations("try");
  const ts = useTranslations("states");
  const locale = useLocale() as Locale;
  const hashId = useHashId();

  const [completions, setCompletions] = useState<ExperimentCompletion[]>([]);
  const [started, setStarted] = useState<string[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [memoryOnly, setMemoryOnly] = useState(false);
  const [direction, setDirection] = useState("");
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    getUserStore()
      .listCompletions()
      .then((list) => {
        if (cancelled) return;
        setCompletions(list);
        setStarted(listStarted());
        setMemoryOnly(storageMode() === "memory");
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A deep link /try#<id>: bring that card into view once the list is on the page.
  useEffect(() => {
    if (!hashId) return;
    document.getElementById(hashId)?.scrollIntoView({ block: "start" });
  }, [hashId]);

  const label = useCallback((slug: string) => localized(DIRECTION_LABELS[slug as DirectionSlug], locale) || slug, [locale]);

  const ranked = rankExperiments(experiments, completions, relations);
  const shown = ranked.filter((r) => !direction || r.experiment.direction === direction);
  const presentDirections = DIRECTIONS.filter((d) => experiments.some((e) => e.direction === d));
  const titleOf = new Map(experiments.map((e) => [e.id, e.title]));
  const similar = ranked.filter((r) => r.similar).slice(0, 3);
  const likedTitles = likedExperiments(experiments, completions).map((e) => `«${e.title}»`);
  const completionById = new Map(completions.map((c) => [c.experimentId, c]));

  async function complete(experimentId: string, r: ReflectionResult): Promise<boolean> {
    const completion: ExperimentCompletion = {
      experimentId,
      rating: r.rating,
      enjoyedProcess: r.answer === "process",
      answer: r.answer,
      reflection: r.reflection,
      completedAt: new Date().toISOString(),
    };
    try {
      await getUserStore().saveCompletion(completion);
    } catch {
      return false;
    }
    setCompletions((prev) => [completion, ...prev.filter((c) => c.experimentId !== experimentId)]);
    setStarted(unmarkStarted(experimentId));
    setMemoryOnly(storageMode() === "memory");
    return true;
  }

  return (
    <Container className="pb-24">
      {(loadFailed || memoryOnly) && (
        <p role="status" className="mb-6 max-w-2xl rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed">
          {loadFailed ? ts("savedLoadFailed") : ts("memoryNotice")}
        </p>
      )}

      {similar.length > 0 && (
        <section aria-labelledby="similar-title" className="mb-10 rounded-3xl border border-accent/40 bg-card p-5 sm:p-7">
          <h2 id="similar-title" className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {t("similarTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("similarLead", { titles: likedTitles.join(", ") })}</p>
          <ul className="mt-4 space-y-1">
            {similar.map((r) => (
              <li key={r.experiment.id}>
                <a href={`#${r.experiment.id}`} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary hover:underline dark:text-[var(--ring)]">
                  {r.experiment.title} <span aria-hidden="true">&nbsp;→</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sm:hidden">
        <FilterSelect
          label={t("filterLabel")}
          value={direction}
          onChange={setDirection}
          anyLabel={t("filterAll")}
          options={presentDirections.map((d) => ({ value: d, label: label(d) }))}
        />
      </div>
      <div role="group" aria-label={t("filterLabel")} className="hidden flex-wrap gap-2 sm:flex">
        {[{ slug: "", name: t("filterAll") }, ...presentDirections.map((d) => ({ slug: d as string, name: label(d) }))].map((d) => (
          <button
            key={d.slug || "all"}
            type="button"
            aria-pressed={direction === d.slug}
            onClick={() => setDirection(d.slug)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
              direction === d.slug ? "border-primary bg-primary text-primary-fg" : "border-border hover:border-fg/40 hover:bg-subtle",
            )}
          >
            {d.name}
          </button>
        ))}
      </div>

      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">{t("rankNote")}</p>
      <p role="status" aria-live="polite" className="mt-3 text-sm font-medium">
        {t("count", { count: shown.length })}
      </p>

      {shown.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border p-8 text-center">
          <h2 className="font-display text-xl font-semibold">{t("emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">{t("emptyLead")}</p>
          <Button className="mt-5" variant="ghost" onClick={() => setDirection("")}>
            {t("showAll")}
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 lg:grid-cols-2">
          {shown.map((r) => {
            const id = r.experiment.id;
            return (
              <ExperimentCard
                key={id}
                experiment={r.experiment}
                directionLabel={label(r.experiment.direction)}
                completion={completionById.get(id)}
                started={started.includes(id)}
                similarTo={r.similarTo ? titleOf.get(r.similarTo) : undefined}
                open={toggled[id] ?? hashId === id}
                onToggleOpen={() => setToggled((prev) => ({ ...prev, [id]: !(prev[id] ?? hashId === id) }))}
                onStart={() => setStarted(markStarted(id))}
                onUnstart={() => setStarted(unmarkStarted(id))}
                onComplete={complete}
              />
            );
          })}
        </ul>
      )}
      <p className="mt-10 text-sm text-muted">{t("privacy")}</p>
    </Container>
  );
}
