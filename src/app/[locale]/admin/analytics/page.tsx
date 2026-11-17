import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Empty, SectionHead } from "@/components/admin/section";
import { aggregateEventsByDay } from "@/lib/admin/analytics";
import { loadEvents } from "@/lib/admin/queries";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { guardStaffPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DAYS = 30;

export default async function Page({ params }: PageProps<"/[locale]/admin/analytics">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await guardStaffPage();
  const t = await getTranslations("admin.analytics");
  const now = new Date();
  const { rows, truncated } = await loadEvents(await createSupabaseServerClient(), DAYS, now);
  const { days, totals } = aggregateEventsByDay(rows, { days: DAYS, now });
  const empty = Object.keys(totals).length === 0;

  return (
    <>
      <SectionHead title={t("title")} lead={t("lead")} />
      {empty ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border">
          <table className="w-full min-w-[32rem] text-left text-sm tabular-nums">
            <thead className="bg-subtle text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">{t("day")}</th>
                {ANALYTICS_EVENTS.map((e) => (
                  <th key={e} scope="col" className="px-4 py-3 text-right">{t(`events.${e}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border bg-subtle/60 font-semibold">
                <th scope="row" className="px-4 py-2.5 text-left">{t("total")}</th>
                {ANALYTICS_EVENTS.map((e) => (
                  <td key={e} className="px-4 py-2.5 text-right">{totals[e] ?? 0}</td>
                ))}
              </tr>
              {days.map((d) => (
                <tr key={d.day} className="border-t border-border">
                  <th scope="row" className="whitespace-nowrap px-4 py-2 text-left font-normal">{d.day}</th>
                  {ANALYTICS_EVENTS.map((e) => (
                    <td key={e} className="px-4 py-2 text-right text-muted">{d.counts[e] ?? 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {truncated && <p className="mt-3 text-sm text-muted">{t("truncated")}</p>}
    </>
  );
}
