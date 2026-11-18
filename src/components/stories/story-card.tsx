"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { SaveButton } from "@/components/ui/save-button";
import { Link } from "@/i18n/navigation";
import type { Locale, Story } from "@/lib/data";
import { pickText } from "@/lib/data/content-utils";

/** Library card: kind badge (demo = fictional), theme, title, first lines, save toggle. */
export function StoryCard({
  story,
  saved,
  saveDisabled,
  onToggleSave,
}: {
  story: Story;
  saved: boolean;
  saveDisabled: boolean;
  onToggleSave: () => void;
}) {
  const t = useTranslations("stories");
  const tk = useTranslations("storyKind");
  const locale = useLocale() as Locale;
  const title = pickText(story.title, locale, story.lang);
  const lead = pickText(story.intro ?? story.before, locale, story.lang);
  const category = story.categories?.[0];
  const inOriginal = !story.title[locale];
  return (
    <li className="card-hover flex flex-col rounded-3xl border border-border bg-card shadow-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={story.kind === "demo" ? "warning" : "primary"}>{tk(story.kind)}</Badge>
        {category && <Badge>{t(`categories.${category}`)}</Badge>}
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold leading-snug tracking-tight text-balance">
        <Link href={`/stories/${story.id}`} className="hover:underline">
          {title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-muted">{lead}</p>
      {inOriginal && <p className="mt-2 text-xs text-muted">{t("originalLang", { lang: t(`langName.${story.lang}`) })}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <Link href={`/stories/${story.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline dark:text-[var(--ring)]">
          {t("read")} <span aria-hidden="true">&nbsp;→</span>
        </Link>
        <SaveButton
          saved={saved}
          disabled={saveDisabled}
          onToggle={onToggleSave}
          labelSave={t("save")}
          labelSaved={t("saved")}
          ariaLabel={saved ? t("unsaveAria", { title }) : t("saveAria", { title })}
        />
      </div>
    </li>
  );
}
