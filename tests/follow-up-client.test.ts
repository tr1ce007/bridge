import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFollowUp } from "@/lib/questionnaire/follow-up";
import { sampleAnswers } from "./helpers/answers";

afterEach(() => vi.unstubAllGlobals());

describe("fetchFollowUp (client hook)", () => {
  it("passes the abort signal to the request and maps the question", async () => {
    vi.stubGlobal("window", {});
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (url === "/api/ai/status") return Response.json({ demo: false, provider: "anthropic" });
        return Response.json({ followUp: { question: "What exactly?" } });
      }),
    );
    const controller = new AbortController();
    const result = await fetchFollowUp(sampleAnswers(), { questionId: "B2", locale: "en", signal: controller.signal });
    expect(result).toEqual({ title: "What exactly?" });
    const followUpCall = calls.find((c) => c.url === "/api/ai/followup");
    expect(followUpCall?.init?.signal).toBe(controller.signal);
  });

  it("does not call the API when the block already had a follow-up", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const answers = sampleAnswers([{ questionId: "fu:B2", value: ["q", "a"] }]);
    expect(await fetchFollowUp(answers, { questionId: "B3", locale: "en" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
