"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { FilterSelect, SearchField } from "@/components/ui/filter-select";
import { useSaved } from "@/hooks/use-saved";
import { AGE_RANGES, STORY_CATEGORIES, STORY_KINDS, type AgeRange, type Locale, type Story, type StoryCategory, type StoryKind } from "@/lib/data";
import { AXIS_TAGS } from "@/lib/data/tags";
import { tagLabel } from "@/lib/matching/tag-labels";
import { filterStories, hasActiveStoryFilter, type StoryQuery } from "@/lib/stories/filter";
import { StoryCard } from "./story-card";
import { Link } from "@/i18n/navigation";

type Filters = { q: string; category: string; interest: string; challenge: string; ageRange: string; kind: string };
const NONE: Filters = { q: "", category: "", interest: "", challenge: "", ageRange: "", kind: "" };

/** /stories body: search + filters (all in the browser), saved state, empty state. */
export function StoriesExplorer({ stories }: { stories: Story[] }) {
  const t = useTranslations("stories");
  const tk = useTranslations("storyKind");
  const ts = useTranslations("states");
  const locale = useLocale() as Locale;
  const saved = useSaved("story");
  const [f, setF] = useState<Filters>(NONE);
  const [onlySaved, setOnlySaved] = useState(false);
  const set = (key: keyof Filters) => (value: string) => setF((prev) => ({ ...prev, [key]: value }));

  const query: StoryQuery = {
    q: f.q,
    category: (f.category || undefined) as StoryCategory | undefined,
    interest: f.interest || undefined,
    challenge: f.challenge || undefined,
    ageRange: (f.ageRange || undefined) as AgeRange | undefined,
    kind: (f.kind || undefined) as StoryKind | undefined,
  };
  const matched = filterStories(stories, query);
  const shown = onlySaved ? matched.filter((s) => saved.ids.includes(s.id)) : matched;
  const active = hasActiveStoryFilter(query) || onlySaved;
  const reset = () => {
    setF(NONE);
    setOnlySaved(false);
  };

  return (
    <Container className="pb-24">
      {(saved.status === "error" || saved.memoryOnly || saved.saveFailed) && (
        <p role="status" className="mb-6 max-w-2xl rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed">
          {saved.saveFailed ? ts("saveFailed") : saved.status === "error" ? ts("savedLoadFailed") : ts("memoryNotice")}
        </p>
      )}

      <form role="search" onSubmit={(e) => e.preventDefault()} className="grid grid-cols-2 items-end gap-3 rounded-3xl border border-border bg-card shadow-card p-4 sm:gap-4 sm:p-6 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-3">
          <SearchField label={t("searchLabel")} value={f.q} onChange={set("q")} placeholder={t("searchPlaceholder")} />
        </div>
        <FilterSelect
          label={t("filterCategory")}
          value={f.category}
          onChange={set("category")}
          anyLabel={t("any")}
          options={STORY_CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))}
        />
        <FilterSelect
          label={t("filterInterest")}
          value={f.interest}
          onChange={set("interest")}
          anyLabel={t("any")}
          options={AXIS_TAGS.interests.map((tag) => ({ value: tag, label: tagLabel("interests", tag, locale) }))}
        />
        <FilterSelect
          label={t("filterChallenge")}
          value={f.challenge}
          onChange={set("challenge")}
          anyLabel={t("any")}
          options={AXIS_TAGS.challenges.map((tag) => ({ value: tag, label: tagLabel("challenges", tag, locale) }))}
        />
        <FilterSelect
          label={t("filterAge")}
          value={f.ageRange}
          onChange={set("ageRange")}
          anyLabel={t("any")}
          options={AGE_RANGES.map((a) => ({ value: a, label: t(`ageRanges.${a}`) }))}
        />
        <FilterSelect
          label={t("filterKind")}
          value={f.kind}
          onChange={set("kind")}
          anyLabel={t("any")}
          options={STORY_KINDS.filter((k) => k !== "demo").map((k) => ({ value: k, label: tk(k) }))}
        />
        <div className="col-span-2 flex flex-wrap items-end gap-x-6 gap-y-2 lg:col-span-1">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} className="size-5 accent-[var(--primary)]" />
            {t("onlySaved")}
          </label>
          {active && (
            <button type="button" onClick={reset} className="min-h-11 text-sm font-semibold text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]">
              {t("reset")}
            </button>
          )}
        </div>
      </form>

      <p role="status" aria-live="polite" className="mt-6 text-sm font-medium">
        {t("resultCount", { count: shown.length, total: stories.length })}
      </p>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-semibold">{onlySaved && !hasActiveStoryFilter(query) ? t("emptySavedTitle") : t("emptyTitle")}</h2>
          <p className="mx-auto mt-3 max-w-lg leading-relaxed text-muted">{onlySaved && !hasActiveStoryFilter(query) ? t("emptySavedLead") : t("emptyLead")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {active && (
              <Button variant="ghost" onClick={reset}>
                {t("reset")}
              </Button>
            )}
            <Button href="/stories/submit">{t("submitCta")}</Button>
          </div>
        </div>
      ) : (
        <ul className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((s) => (
            <StoryCard
              key={s.id}
              story={s}
              saved={saved.ids.includes(s.id)}
              saveDisabled={saved.status === "loading"}
              onToggleSave={() => void saved.toggle(s.id)}
            />
          ))}
        </ul>
      )}

      <p className="mt-10 text-sm text-muted">
        <Link href="/stories/submit" className="font-semibold text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]">
          {t("submitCta")}
        </Link>
      </p>
    </Container>
  );
}
