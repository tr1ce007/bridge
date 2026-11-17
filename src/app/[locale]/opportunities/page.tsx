import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OpportunitiesExplorer } from "@/components/opportunities/opportunities-explorer";
import { PageHeader } from "@/components/ui/page-header";
import { getContent } from "@/lib/data";

// Re-rendered at least daily so the "verified / outdated" badges stay right even without a redeploy
// (the browser also recomputes them from the visitor's own date).
export const revalidate = 86_400;

export async function generateMetadata({ params }: PageProps<"/[locale]/opportunities">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "opportunities" });
  return { title: t("metaTitle"), description: t("lead") };
}

export default async function OpportunitiesPage({ params }: PageProps<"/[locale]/opportunities">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("opportunities");
  // Outdated entries stay in the list: they are shown with an "Устарело" label, not hidden.
  const opportunities = await getContent().listOpportunities({ includeOutdated: true });
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("note")}</p>
      </PageHeader>
      <OpportunitiesExplorer opportunities={opportunities} serverDay={new Date().toISOString().slice(0, 10)} />
    </>
  );
}
