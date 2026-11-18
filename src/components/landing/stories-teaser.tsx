import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow, Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const KINDS = [
  { kind: "verified", tone: "primary" },
  { kind: "documented", tone: "accent" },
  { kind: "user", tone: "neutral" },
] as const;

export function StoriesTeaser() {
  const t = useTranslations("landing.stories");
  const kind = useTranslations("storyKind");
  return (
    <Section id="stories" labelledBy="stories-title">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2 id="stories-title" className="font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">{t("lead")}</p>
          <Button href="/stories" variant="ghost" className="mt-8">
            {t("cta")}
            <span aria-hidden="true">→</span>
          </Button>
        </Reveal>
        <Reveal delay={0.1} className="self-end">
          <div className="rounded-2xl border border-border bg-card shadow-lift">
            <p className="border-b border-border px-6 py-4 text-sm font-medium text-muted sm:px-8">{t("kindsLabel")}</p>
            <ul className="divide-y divide-border">
              {KINDS.map(({ kind: k, tone }, i) => (
                <li key={k} className="grid grid-cols-[1.75rem_1fr] gap-x-3 px-6 py-5 sm:px-8">
                  <span className="pt-0.5 font-display text-xs font-semibold tabular-nums text-muted">0{i + 1}</span>
                  <div>
                    <Badge tone={tone}>{kind(k)}</Badge>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{t(`${k}Desc`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
