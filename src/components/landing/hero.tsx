import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HeroBridge } from "./hero-bridge";

export function Hero() {
  const t = useTranslations("landing.hero");
  return (
    <section aria-labelledby="hero-title" className="pt-16 pb-12 sm:pt-28 sm:pb-16">
      <Container>
        <div className="max-w-4xl">
          <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">
            <span className="h-px w-8 bg-accent" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1
            id="hero-title"
            className="font-display text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-7xl"
          >
            {t("title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted text-pretty sm:text-xl">{t("lead")}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/explore">
              {t("ctaPrimary")}
              <span aria-hidden="true">→</span>
            </Button>
            <Button href="/stories" variant="ghost">
              {t("ctaSecondary")}
            </Button>
          </div>
          <p className="mt-5 text-sm text-muted">{t("note")}</p>
        </div>
        <div className="mt-16 sm:mt-20">
          <HeroBridge />
        </div>
      </Container>
    </section>
  );
}
