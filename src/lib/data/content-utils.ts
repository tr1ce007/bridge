import { sanitizeText } from "./sanitize";
import { AXIS_TAGS } from "./tags";
import {
  AXES,
  storySubmissionSchema,
  type Locale,
  type Opportunity,
  type OpportunityFilter,
  type Story,
  type StoryFilter,
  type StoryText,
  type StorySubmission,
} from "./types";

/** Picks text in `locale`, else the story's original language, else any language. */
export function pickText(text: StoryText | undefined, locale: Locale, original?: Locale): string {
  if (!text) return "";
  return text[locale] ?? (original ? text[original] : undefined) ?? text.ru ?? text.kk ?? text.en ?? "";
}

export function filterStories(stories: Story[], filter: StoryFilter = {}): Story[] {
  const q = filter.q?.trim().toLowerCase();
  return stories.filter((s) => {
    if (filter.kind && s.kind !== filter.kind) return false;
    if (filter.lang && s.lang !== filter.lang) return false;
    if (filter.tag && !s.tags[filter.tag.axis]?.includes(filter.tag.tag)) return false;
    if (q) {
      const hay = Object.values(s.title).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function filterOpportunities(list: Opportunity[], filter: OpportunityFilter = {}): Opportunity[] {
  const q = filter.q?.trim().toLowerCase();
  return list.filter((o) => {
    if (o.status === "outdated" && !filter.includeOutdated) return false;
    if (filter.kind && o.kind !== filter.kind) return false;
    if (filter.level && !o.levels.includes(filter.level) && !o.levels.includes("any")) return false;
    if (q && !`${o.name} ${o.description.ru} ${o.description.en}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const USER_ATTRIBUTION = {
  ru: "История от пользователя, ждёт проверки",
  kk: "Пайдаланушының тарихы, тексеруді күтуде",
  en: "Story shared by a user, awaiting review",
} as const;

/**
 * Validates and sanitizes a submission and turns it into a pending "user" story.
 * Throws a ZodError for invalid input.
 */
export function buildSubmittedStory(input: StorySubmission, id: string): Story {
  const v = storySubmissionSchema.parse(input);
  const clean = (s: string): { [K in Locale]?: string } => ({ [v.lang]: sanitizeText(s) });
  const tags = Object.fromEntries(
    AXES.map((axis) => {
      const allowed = new Set(AXIS_TAGS[axis]);
      return [axis, (v.tags?.[axis] ?? []).filter((t) => allowed.has(t))];
    }),
  ) as Story["tags"];
  return {
    id,
    kind: "user",
    status: "pending",
    lang: v.lang,
    title: clean(v.title),
    ...(v.intro ? { intro: clean(v.intro) } : {}),
    ...(v.category ? { categories: [v.category] } : {}),
    ...(v.ageRange ? { ageRange: v.ageRange } : {}),
    // For user stories `sourceName` is the public author name; absent = anonymous.
    ...(v.displayName && sanitizeText(v.displayName) ? { sourceName: sanitizeText(v.displayName) } : {}),
    attribution: { ...USER_ATTRIBUTION },
    before: clean(v.before),
    challenges: clean(v.challenges),
    turningPoint: clean(v.turningPoint),
    actions: clean(v.actions),
    now: clean(v.now),
    ...(v.advice ? { advice: clean(v.advice) } : {}),
    tags,
  };
}
