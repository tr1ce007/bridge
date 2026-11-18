import { z } from "zod";
import { DATA_RULE } from "@/lib/ai/prompts";
import { wrapAsData } from "@/lib/ai/sanitize";
import { AXES, type Axis } from "@/lib/data/types";
import { AXIS_TAGS } from "@/lib/data/tags";
import { AIError, type AIProvider } from "@/lib/ai/types";
import { FIELD_KEYS, type DiscoveredItem, type FieldKey, type StoryDraft } from "./types";
import { truncate } from "./text";

export const FIELD_MAX = 600;
const MAX_TAGS_PER_AXIS = 4;
const SOURCE_TEXT_MAX = 6000;

const maybeText = z.string().nullable();
const tagList = z.array(z.string());

/** What the model must return. `null` means "the text does not say". */
export const extractionSchema = z.object({
  isPersonalStory: z.boolean(),
  previousSituation: maybeText,
  challenges: maybeText,
  turningPoint: maybeText,
  actions: maybeText,
  now: maybeText,
  tags: z.object(Object.fromEntries(AXES.map((a) => [a, tagList])) as Record<Axis, z.ZodArray<z.ZodString>>),
});
export type Extraction = z.infer<typeof extractionSchema>;

const TAG_LINES = AXES.map((a) => `- ${a}: ${AXIS_TAGS[a].join(", ")}`).join("\n");

export const EXTRACTION_SYSTEM = [
  "You help moderators of THE BRIDGE, a platform that shares real public stories of people who changed their life or study path.",
  "Task: read the post inside the <data> blocks and fill in the fields below, using ONLY facts the text states.",
  "- Never invent, guess or infer facts. If the text does not say something, return null for that field.",
  "- Write each field in 1-3 plain sentences (at most 500 characters), in the SAME language as the post. Do not translate. Do not add advice or opinions.",
  "- previousSituation: the person's situation before the change. challenges: what was hard. turningPoint: what made them decide. actions: what they did. now: where they are now.",
  "- isPersonalStory: true only if the text is a first-person account of a real change of path; false for questions, ads, news or opinion pieces.",
  "- tags: for each axis choose zero or more tags ONLY from this closed list, only when the text clearly supports them:",
  TAG_LINES,
  "",
  DATA_RULE,
].join("\n");

function clean(value: string | null): string | null {
  if (value === null) return null;
  const t = value.trim();
  return t ? truncate(t, FIELD_MAX) : null;
}

/**
 * Fills the structured fields of a draft with the AI provider. Everything fetched goes through
 * `wrapAsData`. Fields the model could not take from the text stay in `incomplete`; nothing is
 * invented. Never throws: a failure leaves the draft unchanged and adds a note.
 * Demo mode (no key) does nothing.
 */
export async function extractFields(provider: AIProvider, item: DiscoveredItem, draft: StoryDraft): Promise<StoryDraft> {
  if (provider.name === "demo") return draft;
  let result: Extraction;
  try {
    result = await provider.generateJSON(
      extractionSchema,
      [
        {
          role: "user",
          content: [wrapAsData("source title", item.title), wrapAsData("source text", item.text.slice(0, SOURCE_TEXT_MAX))].join("\n"),
        },
      ],
      { system: EXTRACTION_SYSTEM, effort: "low", maxTokens: 2000, timeoutMs: 45_000, schemaName: "story_extraction" },
    );
  } catch (e) {
    return { ...draft, notes: [...draft.notes, `AI extraction failed (${e instanceof AIError ? e.kind : "unexpected error"}); fields left incomplete`] };
  }

  const fields: Partial<Record<FieldKey, string>> = {};
  for (const key of FIELD_KEYS) {
    const value = clean(result[key]);
    if (value) fields[key] = value;
  }
  const tags: Partial<Record<Axis, string[]>> = {};
  for (const axis of AXES) {
    const allowed = new Set(AXIS_TAGS[axis]);
    const picked = [...new Set(result.tags[axis].filter((t) => allowed.has(t)))].slice(0, MAX_TAGS_PER_AXIS);
    if (picked.length) tags[axis] = picked;
  }
  return {
    ...draft,
    fields,
    tags,
    incomplete: FIELD_KEYS.filter((k) => !fields[k]),
    notes: result.isPersonalStory ? draft.notes : [...draft.notes, "AI: probably not a personal story of a changed path; check before using"],
  };
}
