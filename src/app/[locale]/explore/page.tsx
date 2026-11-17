import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ExploreFlow } from "@/components/explore/explore-flow";

export async function generateMetadata({ params }: PageProps<"/[locale]/explore">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "explore" });
  return { title: t("metaTitle") };
}

export default function ExplorePage({ params }: PageProps<"/[locale]/explore">) {
  const { locale } = use(params);
  // The [locale] layout has already rejected unknown locales.
  setRequestLocale(locale as Locale);
  return <ExploreFlow />;
}
