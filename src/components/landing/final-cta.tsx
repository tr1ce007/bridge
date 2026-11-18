import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta() {
  const t = useTranslations("landing.final");
  return (
    <section aria-labelledby="final-title" className="relative isolate overflow-hidden py-24 sm:py-36">
      <div aria-hidden="true" className="blueprint absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_60%,#000_20%,transparent_75%)]" />
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2
            id="final-title"
            className="font-display text-[2.25rem] leading-[1.06] font-bold tracking-[-0.035em] text-balance sm:text-6xl"
          >
            {t("title")}
          </h2>
          <p className="mt-6 text-lg text-muted">{t("lead")}</p>
          <Button href="/explore" className="mt-10 sm:px-8">
            {t("cta")}
            <span aria-hidden="true">→</span>
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
