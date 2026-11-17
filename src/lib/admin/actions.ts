"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { AuthError, requireRole, type SessionUser, type StaffRole } from "@/lib/auth/roles";
import { localeSchema } from "@/lib/data/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { ActionErrorCode, ActionState } from "./action-state";
import { todayInAlmaty } from "./analytics";
import {
  addStorySource,
  deleteOpportunity,
  markOpportunityVerified,
  moderateStory,
  removeStorySource,
  resolveReport,
  saveOpportunity,
  type MutationResult,
} from "./mutations";
import {
  idSchema,
  opportunityInputSchema,
  reportResolutionSchema,
  storyModerationSchema,
  storySourceInputSchema,
} from "./schemas";

/**
 * Every admin mutation is one of these server actions. Each one, in this order:
 * 1. `requireRole` (server-side; a hidden button or a layout check is not protection)
 * 2. validates the FormData with zod
 * 3. writes with the signed-in user's own Supabase client, so row level security applies as well
 * Private tables (questionnaire, reports, journal, chat) are never touched here.
 */

const STAFF: readonly StaffRole[] = ["admin", "moderator"];

type Ctx = { user: SessionUser; client: SupabaseClient };

const fail = (code: ActionErrorCode, fields?: string[]): ActionState => ({ status: "error", code, ...(fields ? { fields } : {}) });

function fieldsOf(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((i) => i.path.join(".")).filter(Boolean))];
}

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function fromResult(result: MutationResult<object>, message: string): ActionState {
  return result.ok ? { status: "ok", message } : fail(result.code);
}

/** Auth + client, and a uniform error result for everything that can go wrong. */
async function guarded(roles: readonly StaffRole[], run: (ctx: Ctx) => Promise<ActionState>): Promise<ActionState> {
  try {
    const user = await requireRole(roles);
    const client = await createSupabaseServerClient();
    return await run({ user, client });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code);
    console.error("[admin] action failed:", e instanceof Error ? e.message : e);
    return fail("failed");
  }
}

/** Public pages that show stories / opportunities are re-rendered on their next visit. */
function refreshPublic(kind: "stories" | "opportunities") {
  revalidatePath(`/[locale]/${kind}`, "layout");
}
function refreshAdmin() {
  revalidatePath("/[locale]/admin", "layout");
}

// ---------------------------------------------------------------- stories

export async function moderateStoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guarded(STAFF, async ({ user, client }) => {
    const parsed = storyModerationSchema.safeParse({
      id: str(formData, "id"),
      decision: str(formData, "decision"),
      kind: str(formData, "kind") || undefined,
      sourceUrl: str(formData, "sourceUrl"),
      sourceName: str(formData, "sourceName"),
      note: str(formData, "note"),
    });
    if (!parsed.success) return fail("invalid", fieldsOf(parsed.error));
    const result = await moderateStory(client, user.id, parsed.data);
    if (result.ok) {
      refreshAdmin();
      refreshPublic("stories");
    }
    return fromResult(result, parsed.data.decision === "approve" ? "approved" : "rejected");
  });
}

// ---------------------------------------------------------------- reports

export async function resolveReportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guarded(STAFF, async ({ user, client }) => {
    const parsed = reportResolutionSchema.safeParse({ id: str(formData, "id"), resolution: str(formData, "resolution") });
    if (!parsed.success) return fail("invalid", fieldsOf(parsed.error));
    const result = await resolveReport(client, user.id, parsed.data);
    if (result.ok) refreshAdmin();
    return fromResult(result, parsed.data.resolution);
  });
}

// ---------------------------------------------------------------- opportunities

function readOpportunityForm(fd: FormData) {
  return {
    id: str(fd, "customId").trim() || undefined,
    name: str(fd, "name"),
    kind: str(fd, "kind"),
    levels: fd.getAll("levels").filter((v): v is string => typeof v === "string"),
    country: str(fd, "country"),
    cost: str(fd, "cost"),
    description: { ru: str(fd, "description_ru"), kk: str(fd, "description_kk"), en: str(fd, "description_en") },
    eligibility: { ru: str(fd, "eligibility_ru"), kk: str(fd, "eligibility_kk"), en: str(fd, "eligibility_en") },
    url: str(fd, "url"),
    deadline: str(fd, "deadline"),
    source: str(fd, "source"),
    status: str(fd, "status"),
    verifiedAt: str(fd, "verifiedAt"),
  };
}

/** Create (no `editId`) or update (`editId`) an opportunity. On create it redirects to the list. */
export async function saveOpportunityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeSchema.catch("ru").parse(str(formData, "locale"));
  const editId = str(formData, "editId");
  let created = false;
  const state = await guarded(STAFF, async ({ client }) => {
    const parsed = opportunityInputSchema.safeParse(readOpportunityForm(formData));
    if (!parsed.success) return fail("invalid", fieldsOf(parsed.error));
    const result = await saveOpportunity(client, parsed.data, editId ? { mode: "update", id: editId } : { mode: "create" });
    if (result.ok) {
      refreshAdmin();
      refreshPublic("opportunities");
      created = !editId;
    }
    return fromResult(result, editId ? "saved" : "created");
  });
  // redirect() works by throwing, so it stays outside `guarded`.
  if (created) redirect({ href: "/admin/opportunities", locale });
  return state;
}

export async function markOpportunityVerifiedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guarded(STAFF, async ({ client }) => {
    const parsed = idSchema.safeParse({ id: str(formData, "id") });
    if (!parsed.success) return fail("invalid");
    const result = await markOpportunityVerified(client, parsed.data.id, todayInAlmaty());
    if (result.ok) {
      refreshAdmin();
      refreshPublic("opportunities");
    }
    return fromResult(result, "markedVerified");
  });
}

export async function deleteOpportunityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guarded(STAFF, async ({ client }) => {
    const parsed = idSchema.safeParse({ id: str(formData, "id") });
    if (!parsed.success) return fail("invalid");
    const result = await deleteOpportunity(client, parsed.data.id);
    if (result.ok) {
      refreshAdmin();
      refreshPublic("opportunities");
    }
    return fromResult(result, "deleted");
  });
}

// ---------------------------------------------------------------- story sources

export async function addStorySourceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guarded(STAFF, async ({ client }) => {
    const parsed = storySourceInputSchema.safeParse({
      url: str(formData, "url"),
      name: str(formData, "name"),
      kind: str(formData, "kind"),
      note: str(formData, "note"),
    });
    if (!parsed.success) return fail("invalid", fieldsOf(parsed.error));
    const result = await addStorySource(client, parsed.data);
    if (result.ok) refreshAdmin();
    return fromResult(result, "added");
  });
}

export async function removeStorySourceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guarded(STAFF, async ({ client }) => {
    const parsed = idSchema.safeParse({ id: str(formData, "id") });
    if (!parsed.success) return fail("invalid");
    const result = await removeStorySource(client, parsed.data.id);
    if (result.ok) refreshAdmin();
    return fromResult(result, "removed");
  });
}
