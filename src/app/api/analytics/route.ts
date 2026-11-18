import { rateLimited, readBody } from "@/lib/ai/handlers/common";
import { isClientEvent } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { LOCALES } from "@/lib/data/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/analytics {name, locale} -> 204. Counts an anonymous visit or questionnaire start.
 * Only the event name and page language are stored; unknown events are refused.
 */
export async function POST(request: Request) {
  const limited = rateLimited(request, "analytics");
  if (limited) return limited;
  const body = (await readBody(request)) as { name?: unknown; locale?: unknown } | null;
  if (!body || !isClientEvent(body.name)) return new Response(null, { status: 400 });
  const locale = LOCALES.includes(body.locale as (typeof LOCALES)[number]) ? (body.locale as (typeof LOCALES)[number]) : undefined;
  await trackEvent(body.name, locale);
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
