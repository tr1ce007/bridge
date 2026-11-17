import type { AgeRange, Story, StoryCategory, StoryKind, StoryText } from "@/lib/data/types";

/** Everything the /stories filters can express. Empty / undefined = "any". */
export interface StoryQuery {
  /** Free text: case-insensitive substring over every text field, in every language. */
  q?: string;
  /** Theme (spec category). */
  category?: StoryCategory;
  /** Tag of the `interests` axis. */
  interest?: string;
  /** Tag of the `challenges` axis. */
  challenge?: string;
  ageRange?: AgeRange;
  kind?: StoryKind;
}

const TEXT_FIELDS = ["title", "intro", "before", "challenges", "turningPoint", "actions", "now", "advice"] as const;

function haystack(s: Story): string {
  return TEXT_FIELDS.map((f) => s[f] as StoryText | undefined)
    .flatMap((t) => (t ? Object.values(t) : []))
    .join("\n")
    .toLowerCase();
}

export function hasActiveStoryFilter(query: StoryQuery): boolean {
  return Boolean(query.q?.trim() || query.category || query.interest || query.challenge || query.ageRange || query.kind);
}

/** AND of all active filters. Stories without a stated age never match an age filter. Keeps input order. */
export function filterStories(stories: Story[], query: StoryQuery): Story[] {
  const q = query.q?.trim().toLowerCase();
  return stories.filter((s) => {
    if (query.kind && s.kind !== query.kind) return false;
    if (query.category && !s.categories?.includes(query.category)) return false;
    if (query.interest && !s.tags.interests.includes(query.interest)) return false;
    if (query.challenge && !s.tags.challenges.includes(query.challenge)) return false;
    if (query.ageRange && s.ageRange !== query.ageRange) return false;
    if (q && !haystack(s).includes(q)) return false;
    return true;
  });
}
