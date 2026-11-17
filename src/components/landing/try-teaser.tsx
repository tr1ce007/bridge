import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const EXAMPLES = ["example1", "example2", "example3"] as const;

export function TryTeaser() {
  const t = useTranslations("landing.try");
  return (
    <Section id="try" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <ul className="grid gap-4 md:grid-cols-3">
        {EXAMPLES.map((ex, i) => (
          <Reveal as="li" key={ex} delay={i * 0.08} className="flex h-full flex-col justify-between gap-10 rounded-2xl border border-border bg-card p-7">
              <span className="font-display text-sm font-semibold text-accent-text tabular-nums">0{i + 1}</span>
              <h3 className="font-display text-xl font-semibold leading-snug tracking-tight">{t(ex)}</h3>
            </Reveal>
        ))}
      </ul>
      <Button href="/try" className="mt-10">
        {t("cta")}
        <span aria-hidden="true">→</span>
      </Button>
    </Section>
  );
}
