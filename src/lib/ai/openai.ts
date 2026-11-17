import "server-only";
import { z } from "zod";
import { parseJSON } from "./json";
import { encodeText } from "./stream";
import { AIError, toAIError, type AIProvider, type ChatMessage } from "./types";

/** Used only when OPENAI_MODEL is empty. */
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_JSON_TIMEOUT_MS = 45_000;
const DEFAULT_STREAM_TIMEOUT_MS = 50_000;

/**
 * OpenAI-compatible provider over plain fetch (`/chat/completions`), no extra SDK:
 * `response_format: json_schema` for JSON, SSE for streaming. Works with any compatible base URL.
 */
export function createOpenAIProvider(opts: { apiKey: string; baseUrl?: string; model?: string }): AIProvider {
  const base = (opts.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = opts.model || DEFAULT_OPENAI_MODEL;

  /** `signal` covers both the time limit and, for streams, the reader cancelling. No retries. */
  async function post(body: Record<string, unknown>, signal: AbortSignal): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify({ model, ...body }),
        signal,
      });
    } catch (e) {
      throw new AIError("network", toAIError(e).message);
    }
    if (!res.ok) throw new AIError("http", `HTTP ${res.status}`);
    return res;
  }

  const withSystem = (system: string, messages: ChatMessage[]) => [{ role: "system", content: system }, ...messages];

  return {
    name: "openai",

    async generateJSON(schema, messages, options) {
      const res = await post({
        messages: withSystem(options.system, messages),
        response_format: {
          type: "json_schema",
          json_schema: { name: options.schemaName ?? "result", schema: z.toJSONSchema(schema), strict: false },
        },
      }, AbortSignal.timeout(options.timeoutMs ?? DEFAULT_JSON_TIMEOUT_MS));
      let data: { choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[] };
      try {
        data = await res.json();
      } catch {
        throw new AIError("invalid_json", "provider response is not JSON");
      }
      const choice = data.choices?.[0];
      if (choice?.message?.refusal) throw new AIError("refusal", "the model declined the request");
      if (choice?.finish_reason === "length") throw new AIError("max_tokens", "the answer was cut at the token limit");
      const text = choice?.message?.content ?? "";
      if (!text.trim()) throw new AIError("empty", "no text in the response");
      return parseJSON(schema, text);
    },

    streamChat(messages, options) {
      const abort = new AbortController();
      let reader: ReadableStreamDefaultReader<string> | undefined;
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
            const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(options.timeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS)]);
            const res = await post({ messages: withSystem(options.system, messages), stream: true }, signal);
            if (!res.body) throw new AIError("empty", "no response body");
            reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
            let buffer = "";
            let finish: string | null = null;
            for (;;) {
              const { value, done } = await reader.read();
              if (done || cancelled) break;
              buffer += value;
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const payload = trimmed.slice(5).trim();
                if (payload === "[DONE]") continue;
                try {
                  const chunk = JSON.parse(payload) as { choices?: { delta?: { content?: string; refusal?: string }; finish_reason?: string | null }[] };
                  const c = chunk.choices?.[0];
                  if (c?.delta?.content) push(c.delta.content);
                  if (c?.delta?.refusal) finish = "refusal";
                  if (c?.finish_reason) finish = c.finish_reason;
                } catch {
                  // ignore keep-alive or malformed lines
                }
              }
            }
            if (finish === "refusal") throw new AIError("refusal", "the model declined the request");
            if (finish === "length") throw new AIError("max_tokens", "the answer was cut at the token limit");
          } catch (e) {
            if (!cancelled) {
              const note = options.onFailure?.(toAIError(e));
              if (note) push(note);
            }
          }
          if (!cancelled) {
            try {
              controller.close();
            } catch {
              // already closed
            }
          }
        },
        cancel() {
          // Stop the upstream request too: abort the fetch and cancel its body reader.
          cancelled = true;
          abort.abort();
          void reader?.cancel().catch(() => {});
        },
      });
    },
  };
}
