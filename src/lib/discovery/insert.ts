import { createHash } from "node:crypto";
import { AXES, type Locale } from "@/lib/data/types";
import { FIELD_KEYS, type FieldKey, type StoryDraft } from "./types";

/** Draft field name -> story field name in the database (`previousSituation` is "before"). */
const STORY_FIELD: Record<FieldKey, "before" | "challenges" | "turningPoint" | "actions" | "now"> = {
  previousSituation: "before",
  challenges: "challenges",
  turningPoint: "turningPoint",
  actions: "actions",
  now: "now",
};

/** Placeholder text for a section the source did not provide (shown as "not stated" because it is in `incomplete`). */
const MISSING = "—";

/** Same source address -> same id, so running the script again cannot create a second copy. */
export function draftId(sourceUrl: string): string {
  return `disc-${createHash("sha256").update(sourceUrl).digest("hex").slice(0, 16)}`;
}

const text = (lang: Locale, value: string) => ({ [lang]: value }) as Partial<Record<Locale, string>>;

/** A row for the `stories` table (see storyToRow in supabase-store). Always documented + pending. */
export function toStoryRow(draft: StoryDraft) {
  const { lang } = draft;
  const content: Record<string, unknown> = {
    title: text(lang, draft.title || MISSING),
    // The short quote of the original; a moderator decides whether to keep it as the story's lead.
    ...(draft.excerpt ? { intro: text(lang, draft.excerpt) } : {}),
  };
  for (const key of FIELD_KEYS) {
    content[STORY_FIELD[key]] = text(lang, draft.fields[key] ?? MISSING);
  }
  return {
    id: draftId(draft.sourceUrl),
    kind: "documented" as const,
    status: "pending" as const,
    lang,
    author_id: null,
    source_url: draft.sourceUrl,
    source_name: draft.sourceName,
    attribution: draft.attribution === "anonymous" ? { ru: "Аноним", kk: "Аноним", en: "Anonymous" } : text(lang, draft.attribution),
    published_at: draft.publishedAt ?? null,
    content,
    tags: Object.fromEntries(AXES.map((a) => [a, draft.tags[a] ?? []])),
    incomplete: draft.incomplete.map((k) => STORY_FIELD[k]),
  };
}
