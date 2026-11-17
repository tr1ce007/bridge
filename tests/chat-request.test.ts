import { describe, expect, it, vi } from "vitest";
import { CHAT_MAX_MESSAGE_CHARS, CHAT_MAX_MESSAGES, CHAT_MAX_SUMMARY_CHARS } from "@/lib/ai/chat-limits";
import { ChatRequestError, streamChatReply } from "@/lib/chat/client";
import { toRequestMessages, trimSummary } from "@/lib/chat/request";

const enc = new TextEncoder();
const body = (...parts: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      parts.forEach((p) => c.enqueue(enc.encode(p)));
      c.close();
    },
  });

describe("toRequestMessages", () => {
  it("drops empty messages and merges consecutive turns of the same role", () => {
    const out = toRequestMessages([
      { role: "user", content: "one" },
      { role: "assistant", content: "  " },
      { role: "user", content: "two" },
    ]);
    expect(out).toEqual([{ role: "user", content: "one\n\ntwo" }]);
  });

  it("starts with a user turn and keeps at most the last N messages", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ role: i % 2 === 0 ? ("user" as const) : ("assistant" as const), content: `m${i}` }));
    const out = toRequestMessages(many.slice(0, 59)); // ends with a user turn
    expect(out.length).toBeLessThanOrEqual(CHAT_MAX_MESSAGES);
    expect(out[0].role).toBe("user");
    expect(out[out.length - 1].content).toBe("m58");
  });

  it("cuts a long reply to the limit the route accepts", () => {
    const out = toRequestMessages([
      { role: "user", content: "hi" },
      { role: "assistant", content: "x".repeat(CHAT_MAX_MESSAGE_CHARS + 500) },
      { role: "user", content: "and?" },
    ]);
    expect(out[1].content).toHaveLength(CHAT_MAX_MESSAGE_CHARS);
  });

  it("never ends with an assistant turn", () => {
    const out = toRequestMessages([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
    expect(out).toEqual([{ role: "user", content: "hi" }]);
  });
});

describe("trimSummary", () => {
  it("returns undefined for empty input and cuts at a line break below the limit", () => {
    expect(trimSummary("")).toBeUndefined();
    expect(trimSummary("  ")).toBeUndefined();
    expect(trimSummary("short")).toBe("short");
    const long = ("line of text\n").repeat(1000);
    const out = trimSummary(long)!;
    expect(out.length).toBeLessThanOrEqual(CHAT_MAX_SUMMARY_CHARS);
    expect(out.endsWith("line of text")).toBe(true);
  });
});

describe("streamChatReply", () => {
  const base = { messages: [{ role: "user" as const, content: "hi" }], locale: "en" as const, memoryConsent: false };

  it("posts the contract body and streams chunks, reporting demo mode from the header", async () => {
    const fetchImpl = vi.fn(async () => new Response(body("He", "llo"), { headers: { "x-ai-demo": "true" } }));
    const chunks: string[] = [];
    const out = await streamChatReply({ ...base, onChunk: (c) => chunks.push(c), fetchImpl });
    expect(out).toEqual({ demo: true, aborted: false, text: "Hello" });
    expect(chunks.join("")).toBe("Hello");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/ai/chat");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ messages: base.messages, locale: "en", memoryConsent: false });
    // The route builds its 429 text from Accept-Language, so it must follow the page language.
    expect((init.headers as Record<string, string>)["accept-language"]).toBe("en");
  });

  it("sends profileSummary only when given", async () => {
    const fetchImpl = vi.fn(async () => new Response(body("ok")));
    await streamChatReply({ ...base, memoryConsent: true, profileSummary: "S", onChunk: () => {}, fetchImpl });
    const sent = JSON.parse(((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string));
    expect(sent).toMatchObject({ memoryConsent: true, profileSummary: "S" });
  });

  it("turns 429 into a rateLimited error that carries the localized text from the response", async () => {
    const fetchImpl = async () => Response.json({ error: "Слишком много запросов" }, { status: 429 });
    const err = await streamChatReply({ ...base, onChunk: () => {}, fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(ChatRequestError);
    expect(err).toMatchObject({ kind: "rateLimited", serverMessage: "Слишком много запросов" });
  });

  it("maps 400, other statuses, network failures and empty replies to error kinds", async () => {
    const kind = (fetchImpl: typeof fetch) =>
      streamChatReply({ ...base, onChunk: () => {}, fetchImpl }).catch((e: ChatRequestError) => e.kind);
    expect(await kind(async () => Response.json({ error: "bad" }, { status: 400 }))).toBe("invalid");
    expect(await kind(async () => new Response("oops", { status: 500 }))).toBe("server");
    expect(await kind(async () => { throw new TypeError("Failed to fetch"); })).toBe("network");
    expect(await kind(async () => new Response(body()))).toBe("server");
  });

  it("reports a cut stream as interrupted, but keeps the text already shown", async () => {
    const chunks: string[] = [];
    let pulled = 0;
    const broken = new ReadableStream<Uint8Array>({
      pull(c) {
        if (pulled++ === 0) c.enqueue(enc.encode("part"));
        else c.error(new Error("reset"));
      },
    });
    const err = await streamChatReply({ ...base, onChunk: (c) => chunks.push(c), fetchImpl: async () => new Response(broken) }).catch((e) => e);
    expect(err).toMatchObject({ kind: "interrupted" });
    expect(chunks.join("")).toBe("part");
  });

  it("returns aborted (no error) when the request is cancelled", async () => {
    const ctrl = new AbortController();
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      return new Promise<Response>((_res, rej) => {
        init.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
      });
    }) as unknown as typeof fetch;
    const p = streamChatReply({ ...base, signal: ctrl.signal, onChunk: () => {}, fetchImpl });
    ctrl.abort();
    expect(await p).toMatchObject({ aborted: true, text: "" });
  });
});
