import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getOverviewCounts } from "@/lib/admin/queries";
import { guardStaffPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await guardStaffPage();
  const t = await getTranslations("admin.overview");
  const counts = await getOverviewCounts(await createSupabaseServerClient());

  const cards = [
    { label: t("pendingStories"), value: counts.pendingStories, href: "/admin/stories" },
    { label: t("openReports"), value: counts.openReports, href: "/admin/reports" },
    { label: t("opportunitiesToVerify"), value: counts.opportunitiesToVerify, href: "/admin/opportunities", hint: t("opportunitiesToVerifyHint") },
    { label: t("aiFailures"), value: counts.aiFailuresLast7Days, href: "/admin/ai-failures" },
  ] as const;

  return (
    <div className="grid gap-8">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.href} className="flex flex-col rounded-3xl border border-border bg-card p-5">
            <p className="font-display text-4xl font-semibold tabular-nums">{c.value}</p>
            <p className="mt-2 text-sm font-medium">{c.label}</p>
            {"hint" in c && <p className="mt-1 text-xs text-muted">{c.hint}</p>}
            <Link href={c.href} className="mt-auto pt-4 text-sm font-semibold text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]">
              {t("open")}
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="content-title" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 id="content-title" className="font-display text-lg font-semibold tracking-tight">
            {t("contentTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("contentText")}</p>
        </section>
        <section aria-labelledby="privacy-title" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 id="privacy-title" className="font-display text-lg font-semibold tracking-tight">
            {t("privacyTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("privacyText")}</p>
        </section>
      </div>
    </div>
  );
}
