import type { Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { BridgeLine } from "@/components/bridge-line";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { Stats } from "@/components/landing/stats";
import { HowItWorks } from "@/components/landing/how-it-works";
import { StoriesTeaser } from "@/components/landing/stories-teaser";
import { TryTeaser } from "@/components/landing/try-teaser";
import { OpportunitiesTeaser } from "@/components/landing/opportunities-teaser";
import { Community } from "@/components/landing/community";
import { FinalCta } from "@/components/landing/final-cta";

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  // The [locale] layout has already rejected unknown locales.
  setRequestLocale(locale as Locale);

  return (
    <>
      <Hero />
      <Problem />
      <Stats />
      <HowItWorks />
      <StoriesTeaser />
      <BridgeLine />
      <TryTeaser />
      <OpportunitiesTeaser />
      <Community />
      <FinalCta />
    </>
  );
}
