import { isDemoMode, resolveProviderName } from "@/lib/ai/provider";

export const runtime = "nodejs";
// Reads env at request time; never prerender.
export const dynamic = "force-dynamic";

/** GET /api/ai/status -> {demo, provider}. No keys or model names are exposed. */
export async function GET() {
  return Response.json({ demo: isDemoMode(), provider: resolveProviderName() }, { headers: { "cache-control": "no-store" } });
}
