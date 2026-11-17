import { handleSubmitStory } from "@/lib/stories/handlers/submit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleSubmitStory(request);
}
