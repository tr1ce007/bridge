import type { Axis, Locale } from "@/lib/data/types";

/** One public post or article found by the discovery script (before it becomes a draft). */
export interface DiscoveredItem {
  origin: "reddit" | "rss";
  /** Link to the original (http or https only). */
  sourceUrl: string;
  /** Human name of the place, e.g. "Reddit r/careerguidance" or the feed name. */
  sourceName: string;
  /** Public handle or byline. null = unknown (the draft will say "anonymous"). */
  author: string | null;
  /** YYYY-MM-DD, only when the source states it. */
  publishedAt?: string;
  title: string;
  /** Plain text of the post (HTML removed, capped). Used only for the AI step; never stored in full. */
  text: string;
}

/** The structured story fields the AI step may fill (`previousSituation` is the story's "before"). */
export const FIELD_KEYS = ["previousSituation", "challenges", "turningPoint", "actions", "now"] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

/** A candidate story for manual review. It is never published by the script. */
export interface StoryDraft {
  kind: "documented";
  status: "pending";
  sourceUrl: string;
  sourceName: string;
  /** Public handle ("u/name", a byline) or the word "anonymous". */
  attribution: string;
  publishedAt?: string;
  title: string;
  /** The first part of the original text, at most 500 characters. */
  excerpt: string;
  lang: Locale;
  /** Fields the AI could take from the text, in the language of the source. Missing ones are not here. */
  fields: Partial<Record<FieldKey, string>>;
  tags: Partial<Record<Axis, string[]>>;
  /** Fields that could not be extracted (all of them until the AI step succeeds). */
  incomplete: FieldKey[];
  /** Short remarks for the moderator. */
  notes: string[];
  /** The AI judged that the text is not a first-person story. Such drafts stay in the JSON file but are not inserted. */
  notPersonalStory?: boolean;
}
