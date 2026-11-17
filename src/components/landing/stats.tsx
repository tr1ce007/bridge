import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

// Verified source for the graduates figure (Ruling: use exactly this link).
const GRADUATES_SOURCE_URL =
  "https://tengrinews.kz/article/kazaxstancy-rabotaiut-ne-specialnosti-biznes-ne-zakryt-3400/";

export function Stats() {
  const t = useTranslations("landing.stats");
  return (
    <Section id="stats" eyebrow={t("eyebrow")} title={t("title")}>
      <div className="grid gap-4 md:grid-cols-2">
        <Reveal className="h-full">
          <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-8 sm:p-10">
            <p className="font-display text-4xl font-semibold tracking-tight text-primary sm:text-5xl dark:text-[var(--ring)]">
              {t("graduatesValue")}
            </p>
            <blockquote className="mt-5 text-lg leading-relaxed text-pretty">{t("graduatesText")}</blockquote>
            <figcaption className="mt-auto pt-8 text-sm text-muted">
              {t("sourceLabel")}:{" "}
              <a
                href={GRADUATES_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-border underline-offset-4 hover:text-fg hover:decoration-fg"
              >
                {t("graduatesSource")}
              </a>
            </figcaption>
          </figure>
        </Reveal>
        <Reveal className="h-full" delay={0.08}>
          <figure className="flex h-full flex-col rounded-2xl border border-dashed border-border bg-card p-8 sm:p-10">
            <div className="flex items-start justify-between gap-4">
              <p className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t("teensValue")}</p>
              <Badge tone="warning">{t("unverified")}</Badge>
            </div>
            <blockquote className="mt-5 text-lg leading-relaxed text-pretty">{t("teensText")}</blockquote>
            <figcaption className="mt-auto pt-8 text-sm text-muted">
              {t("sourceLabel")}: {t("teensSource")}
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </Section>
  );
}
