"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { FilterSelect, SearchField } from "@/components/ui/filter-select";
import { useSaved } from "@/hooks/use-saved";
import {
  OPPORTUNITY_COSTS,
  OPPORTUNITY_COUNTRIES,
  OPPORTUNITY_KINDS,
  OPPORTUNITY_LEVELS,
  OPPORTUNITY_STATUSES,
  type Opportunity,
  type OpportunityCost,
  type OpportunityCountry,
  type OpportunityKind,
  type OpportunityLevel,
  type OpportunityStatus,
} from "@/lib/data";
import { filterOpportunities, hasActiveOpportunityFilter, opportunityStatus, type OpportunityQuery } from "@/lib/opportunities/filter";
import { OpportunityCard } from "./opportunity-card";

type Filters = { q: string; kind: string; country: string; level: string; cost: string; status: string };
const NONE: Filters = { q: "", kind: "", country: "", level: "", cost: "", status: "" };

const noopSubscribe = () => () => {};
const clientDay = () => new Date().toISOString().slice(0, 10);

/**
 * "Today" for the verification badges. The server sends the day it rendered; in the browser the
 * badge is recomputed from the visitor's clock, so a page that was built weeks ago still shows
 * "Устарело" correctly (180-day rule). Same value on both sides during hydration.
 */
function useToday(serverDay: string): Date {
  const day = useSyncExternalStore(noopSubscribe, clientDay, () => serverDay);
  return new Date(`${day}T12:00:00Z`);
}

/** /opportunities body: filters, status badges computed at render time, saved state, empty state. */
export function OpportunitiesExplorer({ opportunities, serverDay }: { opportunities: Opportunity[]; serverDay: string }) {
  const t = useTranslations("opportunities");
  const ts = useTranslations("states");
  const saved = useSaved("opportunity");
  const now = useToday(serverDay);
  const [f, setF] = useState<Filters>(NONE);
  const [onlySaved, setOnlySaved] = useState(false);
  const set = (key: keyof Filters) => (value: string) => setF((prev) => ({ ...prev, [key]: value }));

  const query: OpportunityQuery = {
    q: f.q,
    kind: (f.kind || undefined) as OpportunityKind | undefined,
    country: (f.country || undefined) as OpportunityCountry | undefined,
    level: (f.level || undefined) as OpportunityLevel | undefined,
    cost: (f.cost || undefined) as OpportunityCost | undefined,
    status: (f.status || undefined) as OpportunityStatus | undefined,
  };
  const matched = filterOpportunities(opportunities, query, now);
  const shown = onlySaved ? matched.filter((o) => saved.ids.includes(o.id)) : matched;
  const filtersActive = hasActiveOpportunityFilter(query);
  const active = filtersActive || onlySaved;
  const reset = () => {
    setF(NONE);
    setOnlySaved(false);
  };

  return (
    <Container className="pb-24">
      {(saved.status === "error" || saved.memoryOnly || saved.saveFailed) && (
        <p role="status" className="mb-6 max-w-2xl rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed">
          {saved.saveFailed ? ts("saveFailed") : saved.status === "error" ? ts("savedLoadFailed") : ts("memoryNotice")}
        </p>
      )}

      <form role="search" onSubmit={(e) => e.preventDefault()} className="grid grid-cols-2 items-end gap-3 rounded-3xl border border-border bg-card shadow-card p-4 sm:gap-4 sm:p-6 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-3">
          <SearchField label={t("searchLabel")} value={f.q} onChange={set("q")} placeholder={t("searchPlaceholder")} />
        </div>
        <FilterSelect label={t("filterKind")} value={f.kind} onChange={set("kind")} anyLabel={t("any")} options={OPPORTUNITY_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))} />
        <FilterSelect label={t("filterCountry")} value={f.country} onChange={set("country")} anyLabel={t("any")} options={OPPORTUNITY_COUNTRIES.map((c) => ({ value: c, label: t(`countries.${c}`) }))} />
        <FilterSelect label={t("filterLevel")} value={f.level} onChange={set("level")} anyLabel={t("any")} options={OPPORTUNITY_LEVELS.filter((l) => l !== "any").map((l) => ({ value: l, label: t(`levels.${l}`) }))} />
        <FilterSelect label={t("filterCost")} value={f.cost} onChange={set("cost")} anyLabel={t("any")} options={OPPORTUNITY_COSTS.map((c) => ({ value: c, label: c === "unknown" ? t("costsShort.unknown") : t(`costs.${c}`) }))} />
        <FilterSelect label={t("filterStatus")} value={f.status} onChange={set("status")} anyLabel={t("any")} options={OPPORTUNITY_STATUSES.map((s) => ({ value: s, label: t(`statusFilter.${s}`) }))} />
        <div className="col-span-2 flex flex-wrap items-end gap-x-6 gap-y-2 lg:col-span-1">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} className="size-5 accent-[var(--primary)]" />
            {t("onlySaved")}
          </label>
          {active && (
            <button type="button" onClick={reset} className="min-h-11 text-sm font-semibold text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]">
              {t("reset")}
            </button>
          )}
        </div>
      </form>

      <p role="status" aria-live="polite" className="mt-6 text-sm font-medium">
        {t("resultCount", { count: shown.length, total: opportunities.length })}
      </p>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-semibold">{onlySaved && !filtersActive ? t("emptySavedTitle") : t("emptyTitle")}</h2>
          <p className="mx-auto mt-3 max-w-lg leading-relaxed text-muted">{onlySaved && !filtersActive ? t("emptySavedLead") : t("emptyLead")}</p>
          {active && (
            <Button className="mt-6" variant="ghost" onClick={reset}>
              {t("reset")}
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((o) => (
            <OpportunityCard
              key={o.id}
              opportunity={o}
              status={opportunityStatus(o, now)}
              saved={saved.ids.includes(o.id)}
              saveDisabled={saved.status === "loading"}
              onToggleSave={() => void saved.toggle(o.id)}
            />
          ))}
        </ul>
      )}
    </Container>
  );
}
