import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { RETRY_DELAYS_MS, createOpenAIProvider } from "@/lib/ai/openai";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const schema = z.object({ ok: z.boolean() });
const okJson = () =>
  new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }] }), { status: 200 });

/** Runs generateJSON with fake timers so the retry pauses take no real time. */
async function runJSON(fetchMock: ReturnType<typeof vi.fn>, fallbackModel?: string) {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  const provider = createOpenAIProvider({ apiKey: "k", baseUrl: "http://upstream.test/v1", model: "main", fallbackModel });
  const result = provider.generateJSON(schema, [{ role: "user", content: "hi" }], { system: "s", effort: "low", timeoutMs: 60_000 });
  const settled = result.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.runAllTimersAsync();
  return settled;
}

const modelOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string).model as string;

describe("OpenAI-compatible provider retries", () => {
  it("retries a busy answer (503) and then succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("busy", { status: 503 })).mockResolvedValueOnce(okJson());
    const out = await runJSON(fetchMock);
    expect(out).toEqual({ value: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the last retry with the HTTP status", async () => {
    const fetchMock = vi.fn(async () => new Response("busy", { status: 503 }));
    const out = await runJSON(fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length + 1);
    expect((out as { error: { kind: string; message: string } }).error).toMatchObject({ kind: "http", message: "HTTP 503" });
  });

  it("does not retry answers that will not change (400, 401)", async () => {
    for (const status of [400, 401]) {
      const fetchMock = vi.fn(async () => new Response("no", { status }));
      const out = await runJSON(fetchMock);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect((out as { error: { kind: string } }).error.kind).toBe("http");
    }
  });

  it("uses the fallback model only for the last retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("limit", { status: 429 }))
      .mockResolvedValueOnce(okJson());
    const out = await runJSON(fetchMock, "spare");
    expect(out).toEqual({ value: { ok: true } });
    expect(fetchMock.mock.calls.map(modelOf)).toEqual(["main", "main", "spare"]);
  });

  it("retries a network error", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(okJson());
    const out = await runJSON(fetchMock);
    expect(out).toEqual({ value: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries the start of a chat stream without duplicating text", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = createOpenAIProvider({ apiKey: "k", baseUrl: "http://upstream.test/v1", model: "main" });
    const text = new Response(provider.streamChat([{ role: "user", content: "hi" }], { system: "s", locale: "en", onFailure: () => " [failed]" })).text();
    await vi.runAllTimersAsync();
    expect(await text).toBe("Hello");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
