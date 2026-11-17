import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const KINDS = [
  { kind: "verified", tone: "primary" },
  { kind: "documented", tone: "accent" },
  { kind: "user", tone: "neutral" },
  { kind: "demo", tone: "warning" },
] as const;

export function StoriesTeaser() {
  const t = useTranslations("landing.stories");
  const kind = useTranslations("storyKind");
  return (
    <Section id="stories" labelledBy="stories-title">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">{t("eyebrow")}</p>
          <h2 id="stories-title" className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">{t("lead")}</p>
          <Button href="/stories" variant="ghost" className="mt-8">
            {t("cta")}
            <span aria-hidden="true">→</span>
          </Button>
        </Reveal>
        <Reveal delay={0.1} className="self-end">
          <div className="rounded-2xl border border-border bg-card p-8">
            <p className="text-sm text-muted">{t("kindsLabel")}</p>
            <ul className="mt-6 flex flex-col gap-4">
              {KINDS.map(({ kind: k, tone }) => (
                <li key={k} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <Badge tone={tone}>{kind(k)}</Badge>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(`${k}Desc`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
