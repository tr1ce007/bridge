import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta() {
  const t = useTranslations("landing.final");
  return (
    <section aria-labelledby="final-title" className="border-t border-border py-24 sm:py-36">
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2
            id="final-title"
            className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-6xl"
          >
            {t("title")}
          </h2>
          <p className="mt-6 text-lg text-muted">{t("lead")}</p>
          <Button href="/explore" className="mt-10">
            {t("cta")}
            <span aria-hidden="true">→</span>
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
