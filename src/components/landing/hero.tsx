import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HeroBridge } from "./hero-bridge";

export function Hero() {
  const t = useTranslations("landing.hero");
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      {/* Blueprint grid and a pale blue horizon: the drawing board the bridge is designed on. */}
      <div aria-hidden="true" className="blueprint absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-b from-transparent to-primary-soft/60 dark:to-primary-soft/30" />
      <Container>
        <div className="max-w-4xl">
          <p className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-card/80 py-1.5 pr-4 pl-2 text-xs font-semibold tracking-wide text-accent-text shadow-card">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary-soft" aria-hidden="true">
              <span className="size-1.5 rounded-full bg-primary" />
            </span>
            {t("eyebrow")}
          </p>
          <h1
            id="hero-title"
            className="font-display text-[2.5rem] leading-[1.05] font-bold tracking-[-0.035em] text-balance text-fg min-[400px]:text-[2.75rem] sm:text-6xl lg:text-[4.5rem]"
          >
            {t("title")}
          </h1>
          <p className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-muted text-pretty sm:mt-7 sm:text-xl">{t("lead")}</p>
          <div className="mt-9 flex flex-col gap-3 sm:mt-10 sm:flex-row">
            <Button href="/explore" className="sm:min-h-12 sm:px-7 sm:text-[0.9375rem]">
              {t("ctaPrimary")}
              <span aria-hidden="true">→</span>
            </Button>
            <Button href="/stories" variant="ghost" className="sm:min-h-12 sm:px-7 sm:text-[0.9375rem]">
              {t("ctaSecondary")}
            </Button>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-muted">
            <svg viewBox="0 0 16 16" className="size-4 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("note")}
          </p>
        </div>
        <div className="mt-14 sm:mt-16 lg:mt-20">
          <HeroBridge
            labels={{ today: t("today"), todayText: t("todayText"), tomorrow: t("tomorrow"), tomorrowText: t("tomorrowText") }}
          />
        </div>
      </Container>
    </section>
  );
}
