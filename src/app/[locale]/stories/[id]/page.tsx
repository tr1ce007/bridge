import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { StoryActions } from "@/components/stories/story-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getContent, type Story, type StoryText } from "@/lib/data";
import { pickText } from "@/lib/data/content-utils";
import { tagLabel } from "@/lib/matching/tag-labels";
import { relatedStories, sharedTags } from "@/lib/stories/related";
import { missingSections, STORY_SECTIONS } from "@/lib/stories/sections";

// Static for the bundled stories; with Supabase new ids render on demand and refresh every 5 minutes.
export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const stories = await getContent().listStories();
    return routing.locales.flatMap((locale) => stories.map((s) => ({ locale, id: s.id })));
  } catch {
    return []; // database unreachable at build time: pages render on demand
  }
}

export async function generateMetadata({ params }: PageProps<"/[locale]/stories/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const story = await getContent().getStory(decodeURIComponent(id));
  if (!story) return {};
  return { title: pickText(story.title, locale as Locale as "ru" | "kk" | "en", story.lang) };
}

const SECTION_LABELS = {
  before: "sectionBefore",
  challenges: "sectionChallenges",
  actions: "sectionActions",
  turningPoint: "sectionTurningPoint",
  now: "sectionNow",
  advice: "sectionAdvice",
} as const;

export default async function StoryPage({ params }: PageProps<"/[locale]/stories/[id]">) {
  const { locale: rawLocale, id: rawId } = await params;
  const locale = rawLocale as Locale as "ru" | "kk" | "en";
  setRequestLocale(locale);
  const content = getContent();
  const story = await content.getStory(decodeURIComponent(rawId));
  if (!story) notFound();

  const t = await getTranslations("stories");
  const tk = await getTranslations("storyKind");
  const format = await getFormatter();
  const text = (v: StoryText | undefined) => pickText(v, locale, story.lang);

  const title = text(story.title);
  const intro = text(story.intro);
  const missing = missingSections(story, locale);
  const related = relatedStories(story, await content.listStories(), 3);
  const isShownInOriginal = !story.title[locale];
  const published = story.publishedAt && !Number.isNaN(Date.parse(story.publishedAt)) ? format.dateTime(new Date(story.publishedAt), { dateStyle: "long" }) : null;
  const hasSource = (story.kind === "verified" || story.kind === "documented") && Boolean(story.sourceUrl);
  const category = story.categories?.[0];

  return (
    <article className="pb-24">
      <Container className="pt-8 sm:pt-12">
        <Link href="/stories" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline dark:text-[var(--ring)]">
          <span aria-hidden="true">←&nbsp;</span>
          {t("back")}
        </Link>

        <header className="mt-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={story.kind === "demo" ? "warning" : "primary"}>{tk(story.kind)}</Badge>
            {category && <Badge>{t(`categories.${category}`)}</Badge>}
            {story.ageRange && <Badge>{t(`ageRanges.${story.ageRange}`)}</Badge>}
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl">{title}</h1>
          {intro && <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">{intro}</p>}
          {isShownInOriginal && <p className="mt-4 text-sm text-muted">{t("translatedNote", { lang: t(`langName.${story.lang}`) })}</p>}
        </header>

        <div className="mt-8 max-w-3xl">
          <StoryActions storyId={story.id} title={title} />
        </div>

        {missing.length > 0 && (
          <div role="note" className="mt-8 max-w-3xl rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed">
            <p className="font-semibold">{t("incompleteTitle")}</p>
            <p className="mt-1 text-muted">{t("incompleteLead", { fields: missing.map((m) => t(SECTION_LABELS[m]).toLowerCase()).join(", ") })}</p>
          </div>
        )}

        <div className="mt-10 max-w-3xl space-y-10">
          {STORY_SECTIONS.map((key) => {
            const body = text(story[key]);
            return (
              <section key={key} aria-labelledby={`s-${key}`}>
                <h2 id={`s-${key}`} className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">
                  {t(SECTION_LABELS[key])}
                </h2>
                {!body ? (
                  <p className="mt-3 text-muted italic">{t("notStated")}</p>
                ) : (
                  <p className="mt-3 text-lg leading-relaxed whitespace-pre-line text-pretty">{body}</p>
                )}
              </section>
            );
          })}
        </div>

        <aside aria-labelledby="source-title" className="mt-12 max-w-3xl rounded-2xl border border-border bg-card p-5">
          <h2 id="source-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {t("sourceTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed">{text(story.attribution)}</p>
          {story.kind === "user" && <p className="mt-1 text-sm text-muted">{story.sourceName ? t("author", { name: story.sourceName }) : t("authorAnonymous")}</p>}
          {hasSource && (
            <p className="mt-2 text-sm">
              <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]">
                {story.sourceName || t("sourceLink")} <span aria-hidden="true">↗</span>
                <span className="sr-only"> ({t("sourceLink")})</span>
              </a>
            </p>
          )}
          {published && <p className="mt-1 text-sm text-muted">{t("published", { date: published })}</p>}
        </aside>

        <section aria-labelledby="like-me-title" className="mt-12 max-w-3xl rounded-3xl border border-accent/40 bg-card p-6 sm:p-8">
          <h2 id="like-me-title" className="font-display text-2xl font-semibold tracking-tight">
            {t("peopleLikeMeTitle")}
          </h2>
          <p className="mt-2 leading-relaxed text-muted">{t("peopleLikeMeLead")}</p>
          <Button href="/explore" className="mt-5">
            {t("peopleLikeMeCta")}
            <span aria-hidden="true">→</span>
          </Button>
        </section>

        {related.length > 0 && (
          <section aria-labelledby="related-title" className="mt-14">
            <h2 id="related-title" className="font-display text-2xl font-semibold tracking-tight">
              {t("relatedTitle")}
            </h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {related.map((r: Story) => {
                const shared = sharedTags(story, r)
                  .slice(0, 3)
                  .map((x) => tagLabel(x.axis, x.tag, locale))
                  .join(", ");
                return (
                  <li key={r.id} className="rounded-3xl border border-border bg-card p-5">
                    <Badge tone={r.kind === "demo" ? "warning" : "primary"}>{tk(r.kind)}</Badge>
                    <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-balance">
                      <Link href={`/stories/${r.id}`} className="hover:underline">
                        {pickText(r.title, locale, r.lang)}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{t("relatedShared", { tags: shared })}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </Container>
    </article>
  );
}
