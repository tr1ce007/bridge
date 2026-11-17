import type { z } from "zod";
import type { Locale } from "@/lib/data/types";

export type ProviderName = "anthropic" | "openai" | "demo";
export type Effort = "low" | "medium";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  system: string;
  /** "low" for chat / follow-up, "medium" for the report and what-if. */
  effort: Effort;
  maxTokens?: number;
  /**
   * Hard limit for this request, no retries. Keep it well under the route's `maxDuration`
   * (60 s) so the caller always has time to fall back. Default 45 s.
   */
  timeoutMs?: number;
  /** Schema name for providers that need one (OpenAI json_schema). */
  schemaName?: string;
}

export interface ChatOptions {
  system: string;
  effort?: Effort;
  maxTokens?: number;
  /** Whole-stream time limit; default 50 s (route maxDuration is 60 s). */
  timeoutMs?: number;
  locale: Locale;
  /**
   * Called once when the stream fails (network, refusal, max_tokens), never when the reader
   * cancelled. The returned text, if any, is appended so the person sees a calm note.
   */
  onFailure?: (error: AIError) => string | void;
}

export interface AIProvider {
  readonly name: ProviderName;
  /** Structured output validated with `schema`. Throws `AIError` on any problem. */
  generateJSON<T>(schema: z.ZodType<T>, messages: ChatMessage[], options: GenerateOptions): Promise<T>;
  /** Plain-text UTF-8 stream of the assistant's reply. */
  streamChat(messages: ChatMessage[], options: ChatOptions): ReadableStream<Uint8Array>;
}

export type AIErrorKind = "demo" | "refusal" | "max_tokens" | "invalid_json" | "schema" | "http" | "network" | "empty";

export class AIError extends Error {
  constructor(
    public readonly kind: AIErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export function toAIError(e: unknown): AIError {
  if (e instanceof AIError) return e;
  return new AIError("network", e instanceof Error ? e.message : String(e));
}
