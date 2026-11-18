import { useTranslations } from "next-intl";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

// Both figures checked against the published articles (Nov 2026).
const GRADUATES_SOURCE_URL =
  "https://finance.kz/news/trudovoy-disbalans-tret-vypusknikov-v-kazahstane-ne-rabotayut-po-spetsialnosti";
const PUPILS_SOURCE_URL =
  "https://tengrinews.kz/kazakhstan_news/kazahstanskie-shkolniki-podelilis-karernyimi-ojidaniyami-529757/";

/** The one deep-navy band of the landing: two figures, set like an editorial spread. */
export function Stats() {
  const t = useTranslations("landing.stats");
  return (
    <Section id="stats" eyebrow={t("eyebrow")} title={t("title")} tone="navy" className="relative isolate overflow-hidden">
      {/* A faint cable arc across the band. */}
      <svg aria-hidden="true" viewBox="0 0 1200 300" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full w-full">
        <path d="M-20 40 Q600 420 1220 40" fill="none" stroke="#3b7bf6" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d="M-20 70 Q600 450 1220 70" fill="none" stroke="#3b7bf6" strokeOpacity="0.15" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2">
        <Reveal className="h-full">
          <figure className="flex h-full flex-col bg-[#102a56] p-8 sm:p-12">
            <p className="font-display text-6xl font-bold tracking-[-0.04em] text-white sm:text-7xl">{t("graduatesValue")}</p>
            <span aria-hidden="true" className="mt-6 block h-0.5 w-12 rounded-full bg-[#3b7bf6]" />
            <blockquote className="mt-6 text-lg leading-relaxed text-pretty text-white/90">{t("graduatesText")}</blockquote>
            <figcaption className="mt-auto pt-10 text-sm text-white/60">
              {t("sourceLabel")}:{" "}
              <a
                href={GRADUATES_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              >
                {t("graduatesSource")}
              </a>
            </figcaption>
          </figure>
        </Reveal>
        <Reveal className="h-full" delay={0.08}>
          <figure className="flex h-full flex-col bg-[#102a56] p-8 sm:p-12">
            <p className="font-display text-6xl font-bold tracking-[-0.04em] text-white sm:text-7xl">{t("teensValue")}</p>
            <span aria-hidden="true" className="mt-6 block h-0.5 w-12 rounded-full bg-[#3b7bf6]" />
            <blockquote className="mt-6 text-lg leading-relaxed text-pretty text-white/90">{t("teensText")}</blockquote>
            <figcaption className="mt-auto pt-10 text-sm text-white/60">
              {t("sourceLabel")}:{" "}
              <a
                href={PUPILS_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              >
                {t("teensSource")}
              </a>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </Section>
  );
}
