import { handleChat } from "@/lib/ai/handlers/chat";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleChat(request);
}
