import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const POINTS = ["p1", "p2", "p3"] as const;

/** Editorial split: the statement on the left, three numbered points on the right. */
export function Problem() {
  const t = useTranslations("landing.problem");
  return (
    <section id="problem" aria-labelledby="problem-title" className="py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h2 id="problem-title" className="font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-5xl">
              {t("title")}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">{t("lead")}</p>
          </div>
        </Reveal>
        <ol className="lg:col-span-7">
          {POINTS.map((p, i) => (
            <Reveal
              as="li"
              key={p}
              delay={i * 0.08}
              className="group grid grid-cols-[3rem_1fr] gap-x-4 border-t border-border py-8 last:border-b sm:grid-cols-[4.5rem_1fr] sm:py-10"
            >
              <span className="font-display text-sm font-semibold tabular-nums text-primary transition-transform duration-300 group-hover:translate-x-1 dark:text-[var(--ring)]">
                0{i + 1}
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{t(`${p}Title`)}</h3>
                <p className="mt-3 max-w-xl leading-relaxed text-muted">{t(`${p}Text`)}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
