import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function OpportunitiesTeaser() {
  const t = useTranslations("landing.opportunities");
  return (
    <section id="opportunities" aria-labelledby="opportunities-title" className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <div className="rounded-3xl bg-subtle px-6 py-12 sm:px-12 sm:py-16">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p>
            <h2
              id="opportunities-title"
              className="max-w-3xl font-display text-3xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl"
            >
              {t("title")}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{t("lead")}</p>
            <p className="mt-10 font-display text-2xl font-medium tracking-tight sm:text-3xl">{t("programs")}</p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">{t("note")}</p>
              <Button href="/opportunities" variant="ghost" className="shrink-0">
                {t("cta")}
                <span aria-hidden="true">→</span>
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
