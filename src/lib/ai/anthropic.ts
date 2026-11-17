import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { parseJSON } from "./json";
import { encodeText } from "./stream";
import { AIError, toAIError, type AIProvider } from "./types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";
/** Server-side refusal fallback; `fallbacks: "default"` needs this beta (claude-api docs). */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const DEFAULT_JSON_TIMEOUT_MS = 45_000;
const DEFAULT_STREAM_TIMEOUT_MS = 50_000;

/**
 * Anthropic provider. No temperature / top_p / top_k and no `thinking` field (adaptive thinking is
 * the model default); depth is set with `output_config.effort`. Every response's `stop_reason` is
 * checked: a refusal or a `max_tokens` cut is an error, so callers fall back to rule-based output.
 */
export function createAnthropicProvider(opts: { apiKey: string; model?: string }): AIProvider {
  // No automatic retries: a retry could outlive the route's maxDuration and skip the fallback.
  const client = new Anthropic({ apiKey: opts.apiKey, timeout: DEFAULT_JSON_TIMEOUT_MS, maxRetries: 0 });
  const model = opts.model || DEFAULT_ANTHROPIC_MODEL;

  function checkStop(stop: string | null | undefined) {
    if (stop === "refusal") throw new AIError("refusal", "the model declined the request");
    if (stop === "max_tokens") throw new AIError("max_tokens", "the answer was cut at max_tokens");
  }

  return {
    name: "anthropic",

    async generateJSON(schema, messages, options) {
      let response;
      try {
        response = await client.beta.messages.create({
          model,
          max_tokens: options.maxTokens ?? 8000,
          betas: [FALLBACK_BETA],
          fallbacks: "default",
          system: options.system,
          messages,
          output_config: { effort: options.effort, format: betaZodOutputFormat(schema) },
        }, { timeout: options.timeoutMs ?? DEFAULT_JSON_TIMEOUT_MS, maxRetries: 0 });
      } catch (e) {
        throw new AIError("http", e instanceof Anthropic.APIError ? `API error ${e.status}: ${e.message}` : toAIError(e).message);
      }
      checkStop(response.stop_reason);
      const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      if (!text.trim()) throw new AIError("empty", "no text in the response");
      return parseJSON(schema, text);
    },

    streamChat(messages, options) {
      let stream: ReturnType<typeof client.beta.messages.stream> | undefined;
      let cancelled = false;
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          const push = (text: string) => {
            if (cancelled) return;
            try {
              controller.enqueue(encodeText(text));
            } catch {
              // reader already gone
            }
          };
          try {
            stream = client.beta.messages.stream(
              {
                model,
                max_tokens: options.maxTokens ?? 4000,
                betas: [FALLBACK_BETA],
                fallbacks: "default",
                system: options.system,
                messages,
                output_config: { effort: options.effort ?? "low" },
              },
              { timeout: options.timeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS, maxRetries: 0 },
            );
            stream.on("text", (delta: string) => push(delta));
            const final = await stream.finalMessage();
            checkStop(final.stop_reason);
          } catch (e) {
            // A reader that cancelled is not a failure: no log, nothing to append.
            if (!cancelled) {
              const note = options.onFailure?.(toAIError(e));
              if (note) push(note);
            }
          }
          if (!cancelled) {
            try {
              controller.close();
            } catch {
              // already closed / errored
            }
          }
        },
        cancel() {
          cancelled = true;
          stream?.abort();
        },
      });
    },
  };
}
