import { handleReportStory } from "@/lib/stories/handlers/report";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleReportStory(request);
}
