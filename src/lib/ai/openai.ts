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
 * Busy or rate-limited answers worth another try (free tiers often answer 503 "overloaded" for a
 * moment). Each delay is one more attempt; the overall time limit still applies.
 */
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
export const RETRY_DELAYS_MS = [700, 2000, 4000];

/** Waits `ms`, or rejects at once when `signal` aborts (time limit or a cancelled stream). */
function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * OpenAI-compatible provider over plain fetch (`/chat/completions`), no extra SDK:
 * `response_format: json_schema` for JSON, SSE for streaming. Works with any compatible base URL.
 */
export function createOpenAIProvider(opts: {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** Optional second model for the last retry (another model has its own capacity and limits). */
  fallbackModel?: string;
}): AIProvider {
  const base = (opts.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = opts.model || DEFAULT_OPENAI_MODEL;
  const fallbackModel = opts.fallbackModel && opts.fallbackModel !== model ? opts.fallbackModel : undefined;

  /**
   * `signal` covers both the time limit and, for streams, the reader cancelling. Busy answers
   * (429/5xx) and network errors are retried after RETRY_DELAYS_MS; the last retry uses the
   * fallback model when there is one. Nothing has been sent to the reader before this resolves,
   * so retrying never duplicates text.
   */
  async function post(body: Record<string, unknown>, signal: AbortSignal): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const last = attempt >= RETRY_DELAYS_MS.length;
      const useModel = last && fallbackModel ? fallbackModel : model;
      let res: Response;
      try {
        res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${opts.apiKey}` },
          body: JSON.stringify({ model: useModel, ...body }),
          signal,
        });
      } catch (e) {
        if (last || signal.aborted) throw new AIError("network", toAIError(e).message);
        await pause(RETRY_DELAYS_MS[attempt], signal).catch(() => {
          throw new AIError("network", toAIError(e).message);
        });
        continue;
      }
      if (res.ok) return res;
      if (last || !RETRY_STATUSES.has(res.status)) throw new AIError("http", `HTTP ${res.status}`);
      void res.body?.cancel().catch(() => {});
      const status = res.status;
      await pause(RETRY_DELAYS_MS[attempt], signal).catch(() => {
        throw new AIError("http", `HTTP ${status}`);
      });
    }
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
