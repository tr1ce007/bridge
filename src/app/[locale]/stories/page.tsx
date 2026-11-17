import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StoriesExplorer } from "@/components/stories/stories-explorer";
import { PageHeader } from "@/components/ui/page-header";
import { getContent } from "@/lib/data";

// Stories come from the JSON files (static) or from Supabase (refreshed every 5 minutes).
export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]/stories">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "stories" });
  return { title: t("metaTitle"), description: t("lead") };
}

export default async function StoriesPage({ params }: PageProps<"/[locale]/stories">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("stories");
  const stories = await getContent().listStories();
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("kindsNote")}</p>
      </PageHeader>
      <StoriesExplorer stories={stories} />
    </>
  );
}
