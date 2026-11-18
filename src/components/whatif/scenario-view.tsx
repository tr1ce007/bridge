"use client";

import { useTranslations } from "next-intl";
import { WHATIF_PERIODS, type WhatIfPeriod, type WhatIfPeriodPlan } from "@/lib/whatif/schema";

const SECTIONS = ["actions", "experiments", "people", "obstacles"] as const;

function PeriodCard({ period, plan }: { period: WhatIfPeriod; plan: WhatIfPeriodPlan }) {
  const t = useTranslations("whatIf");
  return (
    <li className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-6 print:break-inside-avoid">
      <h3 className="font-display text-lg font-semibold">
        <span className="text-accent-text">{t(`period.${period}`)}</span>
      </h3>
      <div className="mt-4 space-y-4">
        {SECTIONS.map((section) =>
          plan[section].length ? (
            <div key={section}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t(`section.${section}`)}</h4>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
                {plan[section].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
        <p className="rounded-2xl bg-subtle px-4 py-3 text-sm leading-relaxed">
          <span className="font-semibold">{t("section.checkpoint")}: </span>
          {plan.checkpoint}
        </p>
      </div>
    </li>
  );
}

/** The six periods of a scenario. Empty lists are not shown. */
export function ScenarioView({ periods }: { periods: Record<WhatIfPeriod, WhatIfPeriodPlan> }) {
  return (
    <ol className="grid gap-4 lg:grid-cols-2">
      {WHATIF_PERIODS.map((p) => (
        <PeriodCard key={p} period={p} plan={periods[p]} />
      ))}
    </ol>
  );
}
