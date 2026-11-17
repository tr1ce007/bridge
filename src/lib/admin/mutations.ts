import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/data/types";
import {
  slugifyOpportunityId,
  type OpportunityInput,
  type ReportResolution,
  type StoryModeration,
  type StorySourceInput,
} from "./schemas";

/**
 * Database writes of the admin panel. They take the caller's client (the signed-in user's server
 * client, so row level security applies on top) and assume the caller already ran `requireRole`
 * and validated the input with the schemas in ./schemas.
 */

/** "partial": the moderator note was saved, but the story row could not be updated afterwards. */
export type MutationFailure = "not_found" | "duplicate" | "partial" | "failed";
export type MutationResult<T extends object = object> = ({ ok: true } & T) | { ok: false; code: MutationFailure };

interface DbError {
  message: string;
  code?: string;
}

function failure(error: DbError): { ok: false; code: MutationFailure } {
  console.error("[admin] database error:", error.code ?? "", error.message);
  return { ok: false, code: error.code === "23505" ? "duplicate" : "failed" };
}

type Text3 = Record<Locale, string>;

/** Shown under the story, in place of "awaiting review", once a story is published. */
const ATTRIBUTION: Record<"user" | "documented" | "verified", Text3> = {
  user: {
    ru: "История от пользователя, опубликована после модерации",
    kk: "Пайдаланушының тарихы, модерациядан кейін жарияланды",
    en: "Story shared by a user, published after moderation",
  },
  documented: {
    ru: "Публично задокументированная история, источник указан ниже",
    kk: "Жария түрде құжатталған тарих, дереккөзі төменде көрсетілген",
    en: "Publicly documented story, source linked below",
  },
  verified: {
    ru: "История из проверенного источника, источник указан ниже",
    kk: "Тексерілген дереккөздегі тарих, дереккөзі төменде көрсетілген",
    en: "Story from a verified source, source linked below",
  },
};

/**
 * Approve or reject a pending story. Only `pending` rows change, so a double click or an
 * out-of-date page cannot re-moderate a published story.
 */
export async function moderateStory(
  client: SupabaseClient,
  reviewerId: string,
  input: StoryModeration,
  now: Date = new Date(),
): Promise<MutationResult> {
  const reviewedAt = now.toISOString();
  const approve = input.decision === "approve";
  const kind = input.kind ?? "user";

  // Only pending stories can be moderated (a double click or an out-of-date page changes nothing).
  const pending = await client.from("stories").select("id").eq("id", input.id).eq("status", "pending").maybeSingle();
  if (pending.error) return failure(pending.error);
  if (!pending.data) return { ok: false, code: "not_found" };

  // Step 1: the note (staff-only table). Step 2: the story itself. Two writes cannot be one
  // transaction through the API, so the note goes first: if step 2 fails, the story stays pending
  // and nothing is published by accident.
  const review = await client.from("story_reviews").upsert(
    {
      story_id: input.id,
      decision: approve ? "approved" : "rejected",
      note: input.note ?? null,
      reviewed_by: reviewerId,
      reviewed_at: reviewedAt,
    },
    { onConflict: "story_id" },
  );
  if (review.error) return failure(review.error);

  const patch: Record<string, unknown> = {
    status: approve ? "approved" : "rejected",
    reviewed_by: reviewerId,
    reviewed_at: reviewedAt,
  };
  if (approve) {
    patch.kind = kind;
    patch.attribution = ATTRIBUTION[kind];
    if (input.sourceUrl) patch.source_url = input.sourceUrl;
    // For user stories `source_name` is the author's public name: never overwrite it.
    if (kind !== "user" && input.sourceName) patch.source_name = input.sourceName;
  }

  const { data, error } = await client.from("stories").update(patch).eq("id", input.id).eq("status", "pending").select("id");
  if (error) {
    console.error("[admin] story update failed after the note was saved:", error.code ?? "", error.message);
    return { ok: false, code: "partial" };
  }
  if (!data || data.length === 0) return { ok: false, code: "partial" };
  return { ok: true };
}

/** Close an open report as resolved or dismissed. */
export async function resolveReport(
  client: SupabaseClient,
  resolverId: string,
  input: ReportResolution,
  now: Date = new Date(),
): Promise<MutationResult> {
  const { data, error } = await client
    .from("content_reports")
    .update({ status: input.resolution, resolved_by: resolverId, resolved_at: now.toISOString() })
    .eq("id", input.id)
    .eq("status", "open")
    .select("id");
  if (error) return failure(error);
  return data && data.length > 0 ? { ok: true } : { ok: false, code: "not_found" };
}

function opportunityRow(input: OpportunityInput) {
  return {
    name: input.name,
    kind: input.kind,
    levels: input.levels,
    country: input.country,
    cost: input.cost,
    description: input.description,
    eligibility: input.eligibility,
    url: input.url,
    // Exactly what staff typed; empty is null. Never filled in automatically.
    deadline: input.deadline,
    verified_at: input.verifiedAt,
    status: input.status,
    source: input.source ?? null,
  };
}

export async function saveOpportunity(
  client: SupabaseClient,
  input: OpportunityInput,
  target: { mode: "create" } | { mode: "update"; id: string },
): Promise<MutationResult<{ id: string }>> {
  if (target.mode === "create") {
    const id = input.id ?? slugifyOpportunityId(input.name);
    const { error } = await client.from("opportunities").insert({ id, ...opportunityRow(input) });
    return error ? failure(error) : { ok: true, id };
  }
  const { data, error } = await client.from("opportunities").update(opportunityRow(input)).eq("id", target.id).select("id");
  if (error) return failure(error);
  return data && data.length > 0 ? { ok: true, id: target.id } : { ok: false, code: "not_found" };
}

/** «Отметить проверенным сегодня»: only the verification date and status change; the deadline is left alone. */
export async function markOpportunityVerified(client: SupabaseClient, id: string, today: string): Promise<MutationResult> {
  const { data, error } = await client
    .from("opportunities")
    .update({ verified_at: today, status: "verified" })
    .eq("id", id)
    .select("id");
  if (error) return failure(error);
  return data && data.length > 0 ? { ok: true } : { ok: false, code: "not_found" };
}

export async function deleteOpportunity(client: SupabaseClient, id: string): Promise<MutationResult> {
  const { data, error } = await client.from("opportunities").delete().eq("id", id).select("id");
  if (error) return failure(error);
  return data && data.length > 0 ? { ok: true } : { ok: false, code: "not_found" };
}

/** A place to look for stories (feed, subreddit, website). Read by the discovery script. */
export async function addStorySource(client: SupabaseClient, input: StorySourceInput): Promise<MutationResult> {
  const { error } = await client
    .from("story_sources")
    .insert({ url: input.url, name: input.name, kind: input.kind, note: input.note ?? null });
  return error ? failure(error) : { ok: true };
}

export async function removeStorySource(client: SupabaseClient, id: string): Promise<MutationResult> {
  const { data, error } = await client.from("story_sources").delete().eq("id", id).is("story_id", null).select("id");
  if (error) return failure(error);
  return data && data.length > 0 ? { ok: true } : { ok: false, code: "not_found" };
}
