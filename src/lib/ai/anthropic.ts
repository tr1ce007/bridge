import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { parseJSON } from "./json";
import { encodeText } from "./stream";
import { AIError, toAIError, type AIProvider } from "./types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";
/** Server-side refusal fallback; `fallbacks: "default"` needs this beta (claude-api docs). */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/**
 * Anthropic provider. No temperature / top_p / top_k and no `thinking` field (adaptive thinking is
 * the model default); depth is set with `output_config.effort`. Every response's `stop_reason` is
 * checked: a refusal or a `max_tokens` cut is an error, so callers fall back to rule-based output.
 */
export function createAnthropicProvider(opts: { apiKey: string; model?: string }): AIProvider {
  const client = new Anthropic({ apiKey: opts.apiKey, timeout: 90_000, maxRetries: 1 });
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
        });
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
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          const fail = (e: unknown) => {
            const note = options.onFailure?.(toAIError(e));
            if (note) controller.enqueue(encodeText(note));
          };
          try {
            stream = client.beta.messages.stream({
              model,
              max_tokens: options.maxTokens ?? 4000,
              betas: [FALLBACK_BETA],
              fallbacks: "default",
              system: options.system,
              messages,
              output_config: { effort: options.effort ?? "low" },
            });
            stream.on("text", (delta: string) => {
              try {
                controller.enqueue(encodeText(delta));
              } catch {
                // the reader went away (cancelled); `cancel()` aborts the request
              }
            });
            const final = await stream.finalMessage();
            checkStop(final.stop_reason);
          } catch (e) {
            fail(e);
          }
          controller.close();
        },
        cancel() {
          stream?.abort();
        },
      });
    },
  };
}
