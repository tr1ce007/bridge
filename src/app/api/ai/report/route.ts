import { handleReport } from "@/lib/ai/handlers/report";

export const runtime = "nodejs";
// AI calls time out at 45 s (report), 10 s (follow-up) or 50 s (chat), so the fallback always runs in time.
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleReport(request);
}
