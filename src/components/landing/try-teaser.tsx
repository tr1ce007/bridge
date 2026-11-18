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
          <Reveal
            as="li"
            key={ex}
            delay={i * 0.08}
            className="card-hover group relative flex h-full min-h-52 flex-col justify-between gap-10 overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft font-display text-sm font-semibold tabular-nums text-primary dark:text-[var(--ring)]">
                0{i + 1}
              </span>
              <span aria-hidden="true" className="h-px flex-1 translate-x-3 bg-gradient-to-r from-border to-transparent" />
            </div>
            <h3 className="font-display text-xl leading-snug font-semibold tracking-tight">{t(ex)}</h3>
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
