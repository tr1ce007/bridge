import type { Locale, Story } from "@/lib/data/types";
import { pickText } from "@/lib/data/content-utils";

/** Story body sections in reading order (`intro` is a lead, shown only when present). */
export const STORY_SECTIONS = ["before", "challenges", "actions", "turningPoint", "now", "advice"] as const;
export type StorySection = (typeof STORY_SECTIONS)[number];

/** Sections with no text, or that the source marked as not provided (`story.incomplete`). */
export function missingSections(story: Story, locale: Locale): StorySection[] {
  return STORY_SECTIONS.filter((key) => !pickText(story[key], locale, story.lang).trim() || story.incomplete?.includes(key));
}
