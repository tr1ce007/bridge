import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportActions } from "@/components/admin/report-actions";
import { Empty, SectionHead } from "@/components/admin/section";
import { Link } from "@/i18n/navigation";
import { listOpenReports } from "@/lib/admin/queries";
import { guardStaffPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({ params }: PageProps<"/[locale]/admin/reports">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await guardStaffPage();
  const t = await getTranslations("admin.reports");
  const reports = await listOpenReports(await createSupabaseServerClient());
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Almaty" });
  const kinds: Record<string, string> = { story: t("kinds.story"), opportunity: t("kinds.opportunity"), experiment: t("kinds.experiment") };

  return (
    <>
      <SectionHead title={t("title")} lead={t("lead")} />
      {reports.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <ul className="grid gap-4">
          {reports.map((r) => (
            <li key={r.id} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {kinds[r.targetKind] ?? r.targetKind} · {r.targetId}
              </p>
              <p className="mt-2 text-xs text-muted">{t("filedAt", { date: fmt.format(new Date(r.createdAt)) })}</p>
              <p className="mt-3 text-sm font-medium">{t("reason")}</p>
              <p className="mt-1 whitespace-pre-line break-words text-[0.95rem] leading-relaxed">{r.reason}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {r.targetKind === "story" && (
                  <Link href={`/stories/${encodeURIComponent(r.targetId)}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]">
                    {t("openStory")}
                  </Link>
                )}
                <ReportActions id={r.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
