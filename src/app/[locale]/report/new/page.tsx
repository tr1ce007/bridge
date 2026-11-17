import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ReportGenerator } from "@/components/report/report-generator";

export async function generateMetadata({ params }: PageProps<"/[locale]/report/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "report" });
  return { title: t("metaNewTitle"), robots: { index: false } };
}

export default function NewReportPage({ params }: PageProps<"/[locale]/report/new">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  return <ReportGenerator />;
}
