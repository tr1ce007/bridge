import { useTranslations } from "next-intl";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const POINTS = ["p1", "p2", "p3"] as const;

export function Problem() {
  const t = useTranslations("landing.problem");
  return (
    <Section id="problem" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <ol className="grid gap-10 sm:grid-cols-3 sm:gap-8">
        {POINTS.map((p, i) => (
          <Reveal as="li" key={p} delay={i * 0.08} className="border-t border-border pt-6">
              <span className="font-display text-sm font-semibold text-accent-text tabular-nums">0{i + 1}</span>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">{t(`${p}Title`)}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t(`${p}Text`)}</p>
            </Reveal>
        ))}
      </ol>
    </Section>
  );
}
