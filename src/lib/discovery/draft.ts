import type { Locale } from "@/lib/data/types";
import { collapseWhitespace, truncate } from "./text";
import { FIELD_KEYS, type DiscoveredItem, type StoryDraft } from "./types";

/** Copyright: only a short quote of the original is kept in the draft. */
export const EXCERPT_MAX = 500;
export const TITLE_MAX = 200;

const KAZAKH_LETTERS = "әғқңөұүһі";

/** Rough guess of the language of a text: Kazakh letters -> kk, other Cyrillic -> ru, else en. */
export function detectLang(text: string): Locale {
  const lower = text.toLowerCase();
  let cyrillic = 0;
  let latin = 0;
  for (const ch of lower) {
    if (KAZAKH_LETTERS.includes(ch)) return "kk";
    if (ch >= "а" && ch <= "я") cyrillic += 1;
    else if (ch === "ё") cyrillic += 1;
    else if (ch >= "a" && ch <= "z") latin += 1;
  }
  return cyrillic > latin ? "ru" : "en";
}

/** The draft of a story found at `item`. Nothing is extracted yet, so every field is incomplete. */
export function toDraft(item: DiscoveredItem): StoryDraft {
  const title = truncate(collapseWhitespace(item.title), TITLE_MAX);
  return {
    kind: "documented",
    status: "pending",
    sourceUrl: item.sourceUrl,
    sourceName: item.sourceName,
    attribution: item.author && item.origin === "reddit" ? `u/${item.author}` : item.author || "anonymous",
    ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
    title,
    excerpt: truncate(collapseWhitespace(item.text), EXCERPT_MAX),
    lang: detectLang(`${item.title} ${item.text}`),
    fields: {},
    tags: {},
    incomplete: [...FIELD_KEYS],
    notes: [],
  };
}
