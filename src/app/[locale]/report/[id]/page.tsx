import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ReportView } from "@/components/report/report-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/report/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "report" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** The report lives in the user's store (browser or Supabase), so the page renders on the client. */
export default function ReportPage({ params }: PageProps<"/[locale]/report/[id]">) {
  const { locale, id } = use(params);
  setRequestLocale(locale as Locale);
  return <ReportView id={decodeURIComponent(id)} />;
}
