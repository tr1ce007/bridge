import type { Locale } from "@/lib/data/types";
import { readTextStream } from "./stream";
import type { Turn } from "./request";

export type ChatErrorKind = "network" | "rateLimited" | "invalid" | "server" | "interrupted";

export class ChatRequestError extends Error {
  constructor(
    readonly kind: ChatErrorKind,
    /** Localized text sent by the route (429 and 400 responses). */
    readonly serverMessage?: string,
  ) {
    super(kind);
    this.name = "ChatRequestError";
  }
}

export interface StreamChatInput {
  messages: Turn[];
  locale: Locale;
  memoryConsent: boolean;
  profileSummary?: string;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
  fetchImpl?: typeof fetch;
}

export interface StreamChatResult {
  text: string;
  aborted: boolean;
  /** From the `x-ai-demo` header; null when the header is missing. */
  demo: boolean | null;
}

async function errorMessage(res: Response): Promise<string | undefined> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" && data.error.trim() ? data.error : undefined;
  } catch {
    return undefined;
  }
}

/**
 * POST /api/ai/chat and stream the answer to `onChunk`.
 * Throws `ChatRequestError` (network / rateLimited / invalid / server / interrupted); a cancelled
 * request is not an error and returns `aborted: true` with whatever text arrived.
 */
export async function streamChatReply(input: StreamChatInput): Promise<StreamChatResult> {
  const { messages, locale, memoryConsent, profileSummary, signal, onChunk, fetchImpl = fetch } = input;
  let res: Response;
  try {
    res = await fetchImpl("/api/ai/chat", {
      method: "POST",
      // The route writes its error texts in the Accept-Language locale, so follow the page language.
      headers: { "content-type": "application/json", "accept-language": locale },
      body: JSON.stringify({ messages, locale, memoryConsent, ...(profileSummary ? { profileSummary } : {}) }),
      signal,
    });
  } catch {
    if (signal?.aborted) return { text: "", aborted: true, demo: null };
    throw new ChatRequestError("network");
  }

  if (!res.ok) {
    if (res.status === 429) throw new ChatRequestError("rateLimited", await errorMessage(res));
    if (res.status === 400) throw new ChatRequestError("invalid", await errorMessage(res));
    throw new ChatRequestError("server");
  }
  const header = res.headers.get("x-ai-demo");
  const demo = header === "true" ? true : header === "false" ? false : null;
  if (!res.body) throw new ChatRequestError("server");

  try {
    const { text, aborted } = await readTextStream(res.body, onChunk, signal);
    if (!aborted && !text.trim()) throw new ChatRequestError("server");
    return { text, aborted, demo };
  } catch (error) {
    if (error instanceof ChatRequestError) throw error;
    throw new ChatRequestError("interrupted");
  }
}
