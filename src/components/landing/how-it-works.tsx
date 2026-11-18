import { useTranslations } from "next-intl";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const STEPS = ["step1", "step2", "step3", "step4"] as const;

/** Four steps as the piers of one span: a deck line joins them, the last pier is the far bank. */
export function HowItWorks() {
  const t = useTranslations("landing.how");
  return (
    <Section id="how" eyebrow={t("eyebrow")} title={t("title")} tone="subtle">
      <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        <span aria-hidden="true" className="absolute top-[1.375rem] right-0 left-0 hidden h-px bg-gradient-to-r from-border-strong via-primary/40 to-primary lg:block" />
        <span aria-hidden="true" className="absolute top-0 bottom-0 left-[1.375rem] w-px bg-gradient-to-b from-border-strong to-primary/40 sm:hidden" />
        {STEPS.map((step, i) => {
          const last = i === STEPS.length - 1;
          return (
            <Reveal as="li" key={step} delay={i * 0.08} className="relative grid grid-cols-[2.75rem_1fr] gap-x-5 sm:block">
              <span
                className={
                  last
                    ? "relative flex size-11 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold tabular-nums text-primary-fg shadow-button"
                    : "relative flex size-11 items-center justify-center rounded-full border border-border-strong bg-card font-display text-sm font-semibold tabular-nums text-fg shadow-card"
                }
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight sm:mt-7">{t(`${step}Title`)}</h3>
                <p className="mt-2 leading-relaxed text-muted">{t(`${step}Text`)}</p>
              </div>
            </Reveal>
          );
        })}
      </ol>
    </Section>
  );
}
