import "server-only";
import { z } from "zod";
import { rateLimited, readBody } from "@/lib/ai/handlers/common";
import { sanitizeText } from "@/lib/data/sanitize";
import { getServerContent } from "@/lib/data/server";
import { localeSchema } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "../report-reasons";
import { apiError, messageLocale } from "./common";


const input = z.object({
  storyId: z.string().trim().min(1).max(100),
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(500).optional(),
  locale: localeSchema.optional(),
});

/**
 * POST /api/stories/report {storyId, reason, details?}: creates a `content_reports` row
 * (target_kind "story"). RLS lets anyone insert; `reporter_id` is the signed-in user or null.
 * Local mode: 503, nothing is stored.
 */
export async function handleReportStory(request: Request): Promise<Response> {
  const limited = rateLimited(request, "stories-report");
  if (limited) return limited;
  const body = await readBody(request);
  const locale = messageLocale(request, body);
  const parsed = input.safeParse(body);
  if (!parsed.success) return apiError(400, "invalid", locale, "reportInvalid");

  if (!isSupabaseConfigured()) return apiError(503, "local_mode", locale, "reportLocalMode");

  const { storyId, reason, details } = parsed.data;
  try {
    const content = await getServerContent();
    if (!(await content.getStory(storyId))) return apiError(404, "not_found", locale, "reportNotFound");

    const client = await createSupabaseServerClient();
    const { data } = await client.auth.getSession();
    const clean = details ? sanitizeText(details) : "";
    const { error } = await client.from("content_reports").insert({
      reporter_id: data.session?.user.id ?? null,
      target_kind: "story",
      target_id: storyId,
      // content_reports.reason is capped at 500 characters in the database.
      reason: (clean ? `${reason}: ${clean}` : reason).slice(0, 500),
    });
    if (error) throw new Error(error.message);
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("[stories] report failed:", e instanceof Error ? e.message : e);
    return apiError(500, "save_failed", locale, "reportFailed");
  }
}
