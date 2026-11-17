import { useTranslations } from "next-intl";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const STEPS = ["step1", "step2", "step3", "step4"] as const;

export function HowItWorks() {
  const t = useTranslations("landing.how");
  return (
    <Section id="how" eyebrow={t("eyebrow")} title={t("title")}>
      <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {/* The span of the bridge: one line joining all four steps on wide screens. */}
        <span aria-hidden="true" className="absolute top-5 right-0 left-0 hidden h-px bg-border lg:block" />
        {STEPS.map((step, i) => (
          <Reveal as="li" key={step} delay={i * 0.08} className="relative">
              <span className="relative flex size-10 items-center justify-center rounded-full border border-border bg-bg font-display text-sm font-semibold tabular-nums">
                {i + 1}
              </span>
              <h3 className="mt-6 font-display text-xl font-semibold tracking-tight">{t(`${step}Title`)}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t(`${step}Text`)}</p>
            </Reveal>
        ))}
      </ol>
    </Section>
  );
}
