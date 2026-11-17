import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SubmitStoryForm } from "@/components/stories/submit-story-form";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata({ params }: PageProps<"/[locale]/stories/submit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "stories" });
  return { title: t("submitMetaTitle") };
}

export default async function SubmitStoryPage({ params }: PageProps<"/[locale]/stories/submit">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("stories");
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("submitTitle")} lead={t("submitLead")} />
      <SubmitStoryForm />
    </>
  );
}
