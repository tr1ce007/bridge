import type { SupabaseClient } from "@supabase/supabase-js";
import { opportunityFromRow, storyFromRow, type OpportunityRow } from "@/lib/data/supabase-store";
import type { Opportunity, Story } from "@/lib/data/types";
import { opportunityStatus } from "@/lib/opportunities/filter";
import type { EventRow } from "./analytics";

/**
 * Reads for the admin panel, done with the signed-in staff member's client so row level security
 * applies (staff select policies exist for all of these tables). Deliberately absent: the
 * questionnaire, reports, journal and chat tables. Staff never see people's private answers.
 */

const DAY_MS = 86_400_000;

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

async function count(query: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<number> {
  const { count: n, error } = await query;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

// ---------------------------------------------------------------- overview

export interface OverviewCounts {
  pendingStories: number;
  openReports: number;
  /** Opportunities that are unverified or outdated (including a verification older than 180 days). */
  opportunitiesToVerify: number;
  aiFailuresLast7Days: number;
}

export async function getOverviewCounts(client: SupabaseClient, now: Date = new Date()): Promise<OverviewCounts> {
  const since = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const [pendingStories, openReports, opportunityRows, aiFailuresLast7Days] = await Promise.all([
    count(client.from("stories").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(client.from("content_reports").select("id", { count: "exact", head: true }).eq("status", "open")),
    client.from("opportunities").select("status,verified_at").then((r) => must(r) as { status: string; verified_at: string | null }[] | null),
    count(client.from("ai_failures").select("id", { count: "exact", head: true }).gte("created_at", since)),
  ]);
  const opportunitiesToVerify = (opportunityRows ?? []).filter(
    (o) =>
      opportunityStatus(
        { status: o.status as Opportunity["status"], verifiedAt: o.verified_at },
        now,
      ) !== "verified",
  ).length;
  return { pendingStories, openReports, opportunitiesToVerify, aiFailuresLast7Days };
}

// ---------------------------------------------------------------- stories

const STORY_COLUMNS =
  "id,kind,status,lang,source_url,source_name,attribution,published_at,content,tags,incomplete,created_at,consent_at";

export interface PendingStory {
  story: Story;
  createdAt: string;
  consentAt: string | null;
}

/** Oldest first. `unreadableIds` are rows that do not match the story schema: they cannot be shown, but staff can reject them. */
export async function listPendingStories(
  client: SupabaseClient,
): Promise<{ items: PendingStory[]; unreadable: number; unreadableIds: string[] }> {
  const rows = must(
    await client.from("stories").select(STORY_COLUMNS).eq("status", "pending").order("created_at", { ascending: true }).limit(100),
  ) as (Parameters<typeof storyFromRow>[0] & { created_at: string; consent_at: string | null })[] | null;
  const items: PendingStory[] = [];
  const unreadableIds: string[] = [];
  for (const row of rows ?? []) {
    const story = storyFromRow(row);
    if (story) items.push({ story, createdAt: row.created_at, consentAt: row.consent_at });
    else unreadableIds.push(row.id);
  }
  return { items, unreadable: unreadableIds.length, unreadableIds };
}

// ---------------------------------------------------------------- reports

export interface OpenReport {
  id: string;
  targetKind: string;
  targetId: string;
  reason: string;
  createdAt: string;
}

export async function listOpenReports(client: SupabaseClient): Promise<OpenReport[]> {
  const rows = must(
    await client
      .from("content_reports")
      .select("id,target_kind,target_id,reason,created_at")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(200),
  ) as { id: string; target_kind: string; target_id: string; reason: string; created_at: string }[] | null;
  return (rows ?? []).map((r) => ({ id: r.id, targetKind: r.target_kind, targetId: r.target_id, reason: r.reason, createdAt: r.created_at }));
}

// ---------------------------------------------------------------- opportunities

export async function listAdminOpportunities(client: SupabaseClient): Promise<{ items: Opportunity[]; unreadable: number }> {
  const rows = (must(await client.from("opportunities").select("*").order("name", { ascending: true })) ?? []) as OpportunityRow[];
  const items = rows.flatMap((r) => {
    const o = opportunityFromRow(r);
    return o ? [o] : [];
  });
  return { items, unreadable: rows.length - items.length };
}

export async function getAdminOpportunity(client: SupabaseClient, id: string): Promise<Opportunity | null> {
  const row = must(await client.from("opportunities").select("*").eq("id", id).maybeSingle()) as OpportunityRow | null;
  return row ? opportunityFromRow(row) : null;
}

// ---------------------------------------------------------------- story sources

export interface StorySourceRow {
  id: string;
  url: string;
  name: string | null;
  kind: string;
  note: string | null;
  createdAt: string | null;
}

export async function listStorySources(client: SupabaseClient): Promise<StorySourceRow[]> {
  const rows = must(
    await client
      .from("story_sources")
      .select("id,url,name,kind,note,created_at")
      .is("story_id", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ) as { id: string; url: string; name: string | null; kind: string; note: string | null; created_at: string | null }[] | null;
  return (rows ?? []).map((r) => ({ id: r.id, url: r.url, name: r.name, kind: r.kind, note: r.note, createdAt: r.created_at }));
}

// ---------------------------------------------------------------- AI failures

export interface AiFailureRow {
  id: string;
  createdAt: string;
  provider: string | null;
  /** report, followup, chat or whatif ("" for older rows). */
  route: string;
  /** timeout, schema, … */
  kind: string;
}

/** `ai_failures.kind` is stored as "<route>:<kind>". */
export function splitFailureKind(stored: string): { route: string; kind: string } {
  const i = stored.indexOf(":");
  return i < 0 ? { route: "", kind: stored } : { route: stored.slice(0, i), kind: stored.slice(i + 1) };
}

/** Newest first. Only kind, provider and time: no `message` and no user content. */
export async function listAiFailures(client: SupabaseClient, limit = 200): Promise<AiFailureRow[]> {
  const rows = must(
    await client.from("ai_failures").select("id,created_at,provider,kind").order("created_at", { ascending: false }).limit(limit),
  ) as { id: string; created_at: string; provider: string | null; kind: string }[] | null;
  return (rows ?? []).map((r) => ({ id: r.id, createdAt: r.created_at, provider: r.provider, ...splitFailureKind(r.kind) }));
}

// ---------------------------------------------------------------- analytics

const PAGE = 1000;
const MAX_PAGES = 10;

/** Event names and times of the last `days` days (first 10 000 events at most). No other columns. */
export async function loadEvents(client: SupabaseClient, days: number, now: Date = new Date()): Promise<{ rows: EventRow[]; truncated: boolean }> {
  // One day more than the window: the Almaty calendar day starts 5 hours before UTC midnight.
  const since = new Date(now.getTime() - (days + 1) * DAY_MS).toISOString();
  const rows: EventRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const chunk = (must(
      await client
        .from("analytics_events")
        .select("name,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1),
    ) ?? []) as EventRow[];
    rows.push(...chunk);
    if (chunk.length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}
