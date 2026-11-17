import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Empty, SectionHead } from "@/components/admin/section";
import { listAiFailures } from "@/lib/admin/queries";
import { guardStaffPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({ params }: PageProps<"/[locale]/admin/ai-failures">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await guardStaffPage();
  const t = await getTranslations("admin.aiFailures");
  const rows = await listAiFailures(await createSupabaseServerClient());
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Almaty" });
  const routes: Record<string, string> = { report: t("routes.report"), followup: t("routes.followup"), chat: t("routes.chat"), whatif: t("routes.whatif") };

  return (
    <>
      <SectionHead title={t("title")} lead={t("lead")} />
      {rows.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-subtle text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">{t("time")}</th>
                <th scope="col" className="px-4 py-3">{t("route")}</th>
                <th scope="col" className="px-4 py-3">{t("provider")}</th>
                <th scope="col" className="px-4 py-3">{t("kind")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-4 py-2.5">{fmt.format(new Date(r.createdAt))}</td>
                  <td className="px-4 py-2.5">{routes[r.route] ?? (r.route || "—")}</td>
                  <td className="px-4 py-2.5">{r.provider ?? "—"}</td>
                  <td className="px-4 py-2.5">{r.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
