import { z } from "zod";
import { httpUrl } from "@/lib/data/http-url";
import { sanitizeText } from "@/lib/data/sanitize";
import {
  OPPORTUNITY_COSTS,
  OPPORTUNITY_COUNTRIES,
  OPPORTUNITY_KINDS,
  OPPORTUNITY_LEVELS,
  OPPORTUNITY_STATUSES,
} from "@/lib/data/types";

/** Input rules for every admin action. No file here touches the database or the server. */

/** Text typed by staff: markup and control characters removed (`sanitizeText`), length checked after cleaning. */
function cleanText(max: number) {
  return z
    .string()
    .max(max * 2) // generous raw limit; the real limit applies after cleaning
    .transform(sanitizeText)
    .pipe(z.string().min(1).max(max));
}

/** Optional cleaned text: empty or blank becomes undefined. */
function optionalCleanText(max: number) {
  return z
    .string()
    .max(max * 2)
    .optional()
    .transform((v) => (v === undefined ? undefined : sanitizeText(v) || undefined))
    .pipe(z.string().max(max).optional());
}

/** A calendar date as YYYY-MM-DD that really exists (no 2027-02-31). Empty string = no date. */
const isoDate = z
  .string()
  .trim()
  .refine((v) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Use a real date as YYYY-MM-DD");

const nullableDate = z
  .union([z.literal("").transform(() => null), z.null(), isoDate])
  .default(null);

// ---------------------------------------------------------------- stories

/** Kinds staff may give a user's story. `demo` is only for the bundled fictional stories. */
export const STAFF_STORY_KINDS = ["user", "documented", "verified"] as const;
export type StaffStoryKind = (typeof STAFF_STORY_KINDS)[number];
export const NOTE_MAX = 1000;

export const storyModerationSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    decision: z.enum(["approve", "reject"]),
    /** Only used on approval. Documented and verified need `sourceUrl`. */
    kind: z.enum(STAFF_STORY_KINDS).optional(),
    sourceUrl: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), httpUrl.optional()),
    sourceName: optionalCleanText(200),
    note: optionalCleanText(NOTE_MAX),
  })
  .superRefine((v, ctx) => {
    if (v.decision !== "approve") return;
    if (!v.kind) {
      ctx.addIssue({ code: "custom", path: ["kind"], message: "Choose a kind" });
    } else if ((v.kind === "documented" || v.kind === "verified") && !v.sourceUrl) {
      ctx.addIssue({ code: "custom", path: ["sourceUrl"], message: "documented and verified stories need a source URL" });
    }
  });
export type StoryModeration = z.infer<typeof storyModerationSchema>;

// ---------------------------------------------------------------- reports

export const reportResolutionSchema = z.object({
  id: z.uuid(),
  resolution: z.enum(["resolved", "dismissed"]),
});
export type ReportResolution = z.infer<typeof reportResolutionSchema>;

// ---------------------------------------------------------------- opportunities

const localized = (max: number) => z.object({ ru: cleanText(max), kk: cleanText(max), en: cleanText(max) });

export const opportunityInputSchema = z
  .object({
    /** Optional on create (made from the name); never changed on update. */
    id: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{1,59}$/, "Use lowercase letters, digits and dashes")
      .optional(),
    name: cleanText(200),
    kind: z.enum(OPPORTUNITY_KINDS),
    levels: z.array(z.enum(OPPORTUNITY_LEVELS)).min(1),
    country: z.enum(OPPORTUNITY_COUNTRIES),
    cost: z.enum(OPPORTUNITY_COSTS),
    description: localized(2000),
    eligibility: localized(2000),
    url: httpUrl,
    /** Only a date confirmed on the official site; empty = null. Never filled in automatically. */
    deadline: nullableDate,
    source: optionalCleanText(500),
    status: z.enum(OPPORTUNITY_STATUSES),
    verifiedAt: nullableDate,
  })
  .superRefine((v, ctx) => {
    if (v.status === "verified" && !v.verifiedAt) {
      ctx.addIssue({ code: "custom", path: ["verifiedAt"], message: "A verified entry needs a verification date" });
    }
  });
export type OpportunityInput = z.infer<typeof opportunityInputSchema>;

/** `chevening-scholarships-2027` from a Latin name; `opp-<time>` when the name has no Latin letters or digits. */
export function slugifyOpportunityId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug.length >= 2 ? slug : `opp-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------- story sources (feeds the discovery script)

export const STORY_SOURCE_KINDS = ["rss", "reddit", "website", "other"] as const;
export type StorySourceKind = (typeof STORY_SOURCE_KINDS)[number];

export const storySourceInputSchema = z.object({
  url: httpUrl,
  name: cleanText(120),
  kind: z.enum(STORY_SOURCE_KINDS),
  note: optionalCleanText(500),
});
export type StorySourceInput = z.infer<typeof storySourceInputSchema>;

export const idSchema = z.object({ id: z.string().trim().min(1).max(100) });
