import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAIProvider } from "@/lib/ai/openai";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAI-compatible provider streaming", () => {
  it("stops the upstream request when the reader cancels", async () => {
    let upstreamCancelled = false;
    let seenSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      seenSignal = init.signal ?? undefined;
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
          // never closes: a long answer still being generated
        },
        cancel() {
          upstreamCancelled = true;
        },
      });
      return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const onFailure = vi.fn();

    const provider = createOpenAIProvider({ apiKey: "test", baseUrl: "http://upstream.test/v1", model: "m" });
    const stream = provider.streamChat([{ role: "user", content: "hi" }], { system: "s", locale: "en", onFailure });
    const reader = stream.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toBe("Hello");
    await reader.cancel();
    await new Promise((r) => setTimeout(r, 10));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(seenSignal?.aborted).toBe(true);
    expect(upstreamCancelled).toBe(true);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("appends the failure note when the stream is cut at the token limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response('data: {"choices":[{"delta":{"content":"Part"},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n', { status: 200 }),
      ),
    );
    const provider = createOpenAIProvider({ apiKey: "test", baseUrl: "http://upstream.test/v1" });
    const text = await new Response(
      provider.streamChat([{ role: "user", content: "hi" }], { system: "s", locale: "en", onFailure: (e) => ` [${e.kind}]` }),
    ).text();
    expect(text).toBe("Part [max_tokens]");
  });
});
