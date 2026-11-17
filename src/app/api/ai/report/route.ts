import { handleReport } from "@/lib/ai/handlers/report";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleReport(request);
}
