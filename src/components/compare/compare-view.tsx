"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useLoad } from "@/hooks/use-user-data";
import { getUserStore, type DiscoveryReport } from "@/lib/data";
import { compareReports, directionKey } from "@/lib/report/compare";
import { cn } from "@/lib/cn";

export function CompareView() {
  const t = useTranslations("compare");
  const load = useCallback(() => getUserStore().listReports(), []);
  const { state, reload } = useLoad(load);

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
  if (state.data.length < 2) return <EmptyState count={state.data.length} />;
  return <Comparison reports={state.data} />;
}

function EmptyState({ count }: { count: number }) {
  const t = useTranslations("compare");
  return (
    <Container className="pb-20">
      <div className="max-w-2xl rounded-3xl border border-dashed border-border p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">{count === 0 ? t("emptyNoneTitle") : t("emptyOneTitle")}</h2>
        <p className="mt-3 leading-relaxed text-muted">{t("emptyLead")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/explore">{t("ctaRetake")}</Button>
          {count === 1 && (
            <Button href="/dashboard" variant="ghost">
              {t("ctaDashboard")}
            </Button>
          )}
        </div>
      </div>
      <GentleNote />
    </Container>
  );
}

function GentleNote() {
  const t = useTranslations("compare");
  return (
    <p className="mt-6 max-w-2xl rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">
      <span aria-hidden="true" className="mr-2 text-accent">
        ◆
      </span>
      {t("normalNote")}
    </p>
  );
}

type Status = "appeared" | "stayed" | "disappeared";

/** Two reports side by side. Defaults to the oldest and the newest; the earlier one is always on the left. */
function Comparison({ reports }: { reports: DiscoveryReport[] }) {
  const t = useTranslations("compare");
  const format = useFormatter();
  // `reports` is newest first.
  const [first, setFirst] = useState(reports[reports.length - 1].id);
  const [second, setSecond] = useState(reports[0].id);
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  const a = reports.find((r) => r.id === first)!;
  const b = reports.find((r) => r.id === second)!;
  const same = a.id === b.id;
  const [earlier, later] = a.createdAt <= b.createdAt ? [a, b] : [b, a];
  const diff = useMemo(() => compareReports(earlier, later), [earlier, later]);

  const statusIn = (r: DiscoveryReport, name: string): Status => {
    const key = directionKey(name);
    if (r === earlier) return diff.disappeared.some((n) => directionKey(n) === key) ? "disappeared" : "stayed";
    return diff.appeared.some((n) => directionKey(n) === key) ? "appeared" : "stayed";
  };

  const label = (r: DiscoveryReport) => `${date(r.createdAt)} · ${r.directions[0]?.name ?? ""}`;

  return (
    <Container className="pb-20">
      <GentleNote />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {([
          ["first", t("pickFirst"), first, setFirst],
          ["second", t("pickSecond"), second, setSecond],
        ] as const).map(([id, text, value, set]) => (
          <div key={id}>
            <label htmlFor={`compare-${id}`} className="block text-sm font-semibold">
              {text}
            </label>
            <select
              id={`compare-${id}`}
              value={value}
              onChange={(e) => set(e.target.value)}
              className="mt-2 min-h-11 w-full rounded-full border border-border bg-bg px-4 text-sm focus:outline-2 focus:outline-[var(--ring)]"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {label(r)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {same ? (
        <p role="status" className="mt-6 rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
          {t("pickTwo")}
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[earlier, later].map((r, i) => (
              <section key={r.id} aria-labelledby={`col-${i}`} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-text">{i === 0 ? t("earlier") : t("later")}</p>
                <h2 id={`col-${i}`} className="mt-1 font-display text-lg font-semibold">
                  {date(r.createdAt)}
                </h2>
                <h3 className="mt-4 text-sm font-semibold text-muted">{t("directions")}</h3>
                <ul className="mt-2 space-y-2">
                  {r.directions.map((d, idx) => {
                    const status = statusIn(r, d.name);
                    return (
                      <li key={`${d.name}-${idx}`} className="flex flex-wrap items-center gap-2 rounded-2xl bg-subtle px-3 py-2 text-sm">
                        <span className="font-semibold">{d.name}</span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs",
                            status === "stayed" && "border-border text-muted",
                            status === "appeared" && "border-primary/40 text-primary dark:text-[var(--ring)]",
                            status === "disappeared" && "border-accent/60 text-accent-text",
                          )}
                        >
                          {t(`status.${status}`)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <section aria-labelledby="diff-title" className="mt-8">
            <h2 id="diff-title" className="font-display text-2xl font-semibold tracking-tight">
              {t("diffTitle")}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <DiffList title={t("appeared")} items={diff.appeared} empty={t("noneHere")} />
              <DiffList title={t("stayed")} items={diff.stayed} empty={t("noneHere")} />
              <DiffList title={t("disappeared")} items={diff.disappeared} empty={t("noneHere")} />
            </div>
          </section>

          <section aria-labelledby="patterns-title" className="mt-10">
            <h2 id="patterns-title" className="font-display text-2xl font-semibold tracking-tight">
              {t("patternsTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t("patternsLead")}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <DiffList title={t("patternsAppeared")} items={diff.patternsAppeared} empty={t("noneHere")} />
              <DiffList title={t("patternsStayed")} items={diff.patternsStayed} empty={t("noneHere")} />
              <DiffList title={t("patternsDisappeared")} items={diff.patternsDisappeared} empty={t("noneHere")} />
            </div>
          </section>
        </>
      )}
    </Container>
  );
}

function DiffList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
              <span className="min-w-0 break-words">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}
