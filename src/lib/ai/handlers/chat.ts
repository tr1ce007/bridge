import "server-only";
import { z } from "zod";
import { CHAT_MAX_MESSAGE_CHARS, CHAT_MAX_MESSAGES, CHAT_MAX_SUMMARY_CHARS } from "../chat-limits";
import { logAIFailure } from "../log";
import { chatSystemPrompt } from "../prompts";
import { getProvider } from "../provider";
import { aiCopy } from "../server-copy";
import { badRequest, localeInput, looseLocale, rateLimited, readBody } from "./common";

const input = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(CHAT_MAX_MESSAGE_CHARS) }))
    .min(1)
    .max(CHAT_MAX_MESSAGES),
  locale: localeInput,
  memoryConsent: z.boolean(),
  profileSummary: z.string().max(CHAT_MAX_SUMMARY_CHARS).optional(),
});

/**
 * POST /api/ai/chat: {messages, locale, memoryConsent, profileSummary?} -> text/plain stream.
 * Nothing is stored here. `profileSummary` reaches the model only when memoryConsent is true.
 * Demo mode streams a short localized note with links to /explore, /stories and /try.
 */
export async function handleChat(request: Request): Promise<Response> {
  const limited = rateLimited(request, "chat");
  if (limited) return limited;
  const body = await readBody(request);
  const parsed = input.safeParse(body);
  if (!parsed.success) return badRequest(looseLocale(body));
  const { locale, memoryConsent, profileSummary } = parsed.data;

  // The conversation must start and end with the person's turn.
  const messages = parsed.data.messages.slice(parsed.data.messages.findIndex((m) => m.role === "user"));
  if (!messages.length || messages[messages.length - 1].role !== "user") return badRequest(locale);

  const provider = getProvider();
  const stream = provider.streamChat(messages, {
    system: chatSystemPrompt(locale, memoryConsent ? profileSummary : undefined),
    effort: "low",
    maxTokens: 4000,
    timeoutMs: 50_000,
    locale,
    onFailure: (err) => {
      void logAIFailure({ route: "chat", provider: provider.name, kind: err.kind, message: err.message, locale });
      return `\n\n${aiCopy(locale, "chatFailed")}`;
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-ai-demo": String(provider.name === "demo") },
  });
}
