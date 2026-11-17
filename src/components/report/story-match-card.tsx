"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { DiscoveryReport, Story } from "@/lib/data";
import { pickText } from "@/lib/data/content-utils";

type Match = DiscoveryReport["stories"][number];

const RELEVANCE_TONE = { low: "neutral", medium: "primary", high: "accent" } as const;

/** Similar story: kind badge (demo = fictional), relevance chip (a category, never a percentage), why / differences. */
export function StoryMatchCard({ match, story }: { match: Match; story: Story }) {
  const t = useTranslations("report");
  const tk = useTranslations("storyKind");
  const locale = useLocale();
  return (
    <article className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 print:break-inside-avoid">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={story.kind === "demo" ? "warning" : "primary"}>{tk(story.kind)}</Badge>
        <Badge tone={RELEVANCE_TONE[match.relevance]}>
          {t("relevanceLabel")}: {t(`relevance.${match.relevance}`)}
        </Badge>
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold leading-snug text-balance">{pickText(story.title, locale, story.lang)}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{pickText(story.before, locale, story.lang)}</p>
      {match.why.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("similar")}</h4>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed">
            {match.why.map((w, i) => (
              <li key={i}>✓ {w}</li>
            ))}
          </ul>
        </div>
      )}
      {match.differences.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("different")}</h4>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-muted">
            {match.differences.map((d, i) => (
              <li key={i}>≠ {d}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto pt-5 print:hidden">
        <Link href={`/stories/${story.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline dark:text-[var(--ring)]">
          {t("readStory")} <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
    </article>
  );
}
