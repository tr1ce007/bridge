import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AIProvider } from "@/lib/ai/types";
import { reportSchema } from "@/lib/report/schema";
import { sampleAnswers } from "./helpers/answers";

const state: { provider: AIProvider | null } = { provider: null };

vi.mock("@/lib/ai/provider", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ai/provider")>();
  return {
    ...real,
    getProvider: () => state.provider ?? real.getProvider(),
    isDemoMode: () => (state.provider ? state.provider.name === "demo" : real.isDemoMode()),
  };
});

function fakeProvider(generate: AIProvider["generateJSON"]): AIProvider {
  return {
    name: "anthropic",
    generateJSON: generate,
    streamChat: () => new ReadableStream({ start: (c) => c.close() }),
  };
}

let ip = 0;
function post(url: string, body: unknown) {
  ip += 1;
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${ip}` },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/report", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    state.provider = null;
    errorSpy.mockRestore();
  });

  it("falls back on invalid json", async () => {
    state.provider = fakeProvider(async () => "}{ not json at all" as never);
    const { POST } = await import("@/app/api/ai/report/route");
    const res = await POST(post("http://localhost/api/ai/report", { answers: sampleAnswers(), locale: "ru" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.demo).toBe(true);
    expect(reportSchema.safeParse(body.report).success).toBe(true);
    expect(body.report.demo).toBe(true);
    // the failure is logged as a structured line (no Supabase configured in tests)
    const logged = errorSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");
    expect(logged).toContain("ai_failure");
  });

  it("falls back when the provider throws", async () => {
    state.provider = fakeProvider(async () => {
      throw new Error("timeout");
    });
    const { POST } = await import("@/app/api/ai/report/route");
    const res = await POST(post("http://localhost/api/ai/report", { answers: sampleAnswers(), locale: "en" }));
    const body = await res.json();
    expect(body.demo).toBe(true);
    expect(body.report.locale).toBe("en");
  });

  it("keeps a valid AI report and drops stories that were not candidates", async () => {
    const direction = (n: number) => ({
      name: `Direction ${n}`,
      why: "Because of your answers about people.",
      supportingAnswers: ["B1"],
      difficulties: ["d"],
      skills: ["s"],
      howToTest: ["t"],
      realityCheck: { activities: ["a"], misconceptions: ["m"], entryRoutes: ["e"] },
    });
    let seenSystem = "";
    state.provider = fakeProvider(async (schema, _messages, options) => {
      seenSystem = options.system;
      return schema.parse({
        startingPoint: "You are at university.",
        patterns: ["p"],
        unnoticed: ["u"],
        directions: [1, 2, 3, 4, 5, 6].map(direction),
        stories: [
          { storyId: "demo-small-town-abroad", relevance: "high", why: ["w"], differences: ["d"] },
          { storyId: "made-up-story", relevance: "high", why: ["w"], differences: ["d"] },
        ],
        unexpected: [{ name: "Sports management", why: "w" }],
        experiments: [{ title: "Try it", description: "d", experimentId: "exp-programming-first" }],
        roadmap: { d7: ["one"], d30: ["two"], d90: ["three"] },
      });
    });
    const { POST } = await import("@/app/api/ai/report/route");
    const res = await POST(post("http://localhost/api/ai/report", { answers: sampleAnswers(), locale: "en" }));
    const body = await res.json();
    expect(body.demo).toBe(false);
    expect(reportSchema.safeParse(body.report).success).toBe(true);
    expect(body.report.stories.map((s: { storyId: string }) => s.storyId)).toEqual(["demo-small-town-abroad"]);
    expect(body.report.roadmap.d7[0]).toMatchObject({ text: "one", done: false });
    expect(seenSystem).toMatch(/never predict/i);
  });

  it("rejects invalid input and an unfinished questionnaire", async () => {
    const { POST } = await import("@/app/api/ai/report/route");
    expect((await POST(post("http://localhost/api/ai/report", { answers: "x", locale: "ru" }))).status).toBe(400);
    const unfinished = await POST(post("http://localhost/api/ai/report", { answers: [{ questionId: "A1", value: "a18_22" }], locale: "ru" }));
    expect(unfinished.status).toBe(422);
  });

  it("uses the rule-based report without logging a failure in demo mode", async () => {
    const { POST } = await import("@/app/api/ai/report/route");
    const res = await POST(post("http://localhost/api/ai/report", { answers: sampleAnswers(), locale: "kk" }));
    const body = await res.json();
    expect(body.demo).toBe(true);
    expect(body.report.locale).toBe("kk");
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/ai/followup and /api/ai/chat in demo mode", () => {
  it("followup returns null in demo mode", async () => {
    const { POST } = await import("@/app/api/ai/followup/route");
    const res = await POST(post("http://localhost/api/ai/followup", { answers: sampleAnswers(), locale: "ru", questionId: "B2" }));
    expect(await res.json()).toEqual({ followUp: null });
  });

  it("followup asks at most one question per block", async () => {
    let calls = 0;
    state.provider = fakeProvider(async (schema) => {
      calls += 1;
      return schema.parse({ ask: true, question: "What exactly do you enjoy about it?" });
    });
    const { POST } = await import("@/app/api/ai/followup/route");
    const first = await POST(post("http://localhost/api/ai/followup", { answers: sampleAnswers(), locale: "en", questionId: "B2" }));
    expect(await first.json()).toEqual({ followUp: { question: "What exactly do you enjoy about it?" } });
    const withFollowUp = sampleAnswers([
      { questionId: "B3", value: "Coding at night" },
      { questionId: "fu:B2", value: ["What exactly?", "Strategy"] },
    ]);
    const second = await POST(post("http://localhost/api/ai/followup", { answers: withFollowUp, locale: "en", questionId: "B3" }));
    expect(await second.json()).toEqual({ followUp: null });
    expect(calls).toBe(1);
    state.provider = null;
  });

  it("chat streams a localized 'AI not connected' note with links in demo mode", async () => {
    const { POST } = await import("@/app/api/ai/chat/route");
    const res = await POST(
      post("http://localhost/api/ai/chat", { messages: [{ role: "user", content: "Привет" }], locale: "ru", memoryConsent: false }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    const text = await res.text();
    expect(text).toMatch(/ИИ не подключ/);
    expect(text).toContain("/ru/explore");
    expect(text).toContain("/ru/stories");
    expect(text).toContain("/ru/try");
  });

  it("rate limits each visitor per route", async () => {
    const { POST } = await import("@/app/api/ai/followup/route");
    const req = () =>
      new Request("http://localhost/api/ai/followup", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.9" },
        body: JSON.stringify({ answers: [], locale: "en", questionId: "B2" }),
      });
    const limit = Number(process.env.RATE_LIMIT_PER_MINUTE || 10);
    for (let i = 0; i < limit; i++) expect((await POST(req())).status).not.toBe(429);
    const blocked = await POST(req());
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toMatch(/minute/i);
  });
});
