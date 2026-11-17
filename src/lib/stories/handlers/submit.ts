import "server-only";
import { z } from "zod";
import { rateLimited, readBody } from "@/lib/ai/handlers/common";
import { SignInRequiredError } from "@/lib/data";
import { trackEvent } from "@/lib/analytics/track";
import { getServerContent } from "@/lib/data/server";
import { localeSchema, storySubmissionSchema, SUBMISSION_LIMITS, STORY_CATEGORIES } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { apiError, messageLocale } from "./common";

/**
 * What the form sends. The shared `storySubmissionSchema` (which `submitStory` validates again)
 * plus the fields the form requires: an intro, a category, and consent as a real `true`.
 */
const input = storySubmissionSchema.extend({
  intro: z.string().trim().min(1).max(SUBMISSION_LIMITS.intro),
  category: z.enum(STORY_CATEGORIES),
  anonymous: z.boolean().optional(),
  locale: localeSchema.optional(),
  consent: z.literal(true),
});

/**
 * POST /api/stories: send a story for moderation.
 * Order: rate limit (429) -> body is an object (400) -> consent (400) -> fields (400)
 * -> local mode (503, nothing is stored) -> sign-in required (401) -> saved as kind "user",
 * status "pending" (201). Text is stripped of markup in `submitStory` (`sanitizeText`).
 */
export async function handleSubmitStory(request: Request): Promise<Response> {
  const limited = rateLimited(request, "stories");
  if (limited) return limited;
  const body = await readBody(request);
  const locale = messageLocale(request, body);
  if (!body || typeof body !== "object" || Array.isArray(body)) return apiError(400, "invalid", locale, "invalid");

  if ((body as { consent?: unknown }).consent !== true) return apiError(400, "consent_required", locale, "consentRequired");

  const parsed = input.safeParse(body);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "")))].filter(Boolean);
    return apiError(400, "invalid", locale, "invalid", { fields });
  }

  // Never pretend: without a database nothing is saved.
  if (!isSupabaseConfigured()) return apiError(503, "local_mode", locale, "localMode");

  // `storySubmissionSchema` drops the form-only keys (consent, locale, anonymous).
  const { displayName, ...submission } = storySubmissionSchema.parse(parsed.data);
  try {
    const content = await getServerContent();
    const result = await content.submitStory(
      {
        ...submission,
        // Anonymous unless the person switched it off and gave a name.
        ...(parsed.data.anonymous === false && displayName ? { displayName } : {}),
      },
      // `consent` is a real `true` here (checked above): record when it was given.
      { consentAt: new Date().toISOString() },
    );
    await trackEvent("story_submitted", parsed.data.locale ?? locale);
    return Response.json(result, { status: 201 });
  } catch (e) {
    // The RLS insert policy is `to authenticated`: anonymous visitors cannot insert.
    if (e instanceof SignInRequiredError) return apiError(401, "sign_in_required", locale, "signInRequired");
    console.error("[stories] submit failed:", e instanceof Error ? e.message : e);
    return apiError(500, "save_failed", locale, "saveFailed");
  }
}
