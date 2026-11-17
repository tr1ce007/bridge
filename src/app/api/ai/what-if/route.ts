import { handleWhatIf } from "@/lib/ai/handlers/whatif";

export const runtime = "nodejs";
// The AI call times out at 45 s (no retries), so the rule-based fallback always runs in time.
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleWhatIf(request);
}
