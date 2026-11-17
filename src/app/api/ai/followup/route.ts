import { handleFollowUp } from "@/lib/ai/handlers/followup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleFollowUp(request);
}
