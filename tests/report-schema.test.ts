import { describe, expect, it } from "vitest";
import { reportSchema, type DiscoveryReport } from "@/lib/report/schema";

const direction = (n: number) => ({
  name: `Направление ${n}`,
  why: "потому что",
  supportingAnswers: ["a"],
  difficulties: ["d"],
  skills: ["s"],
  howToTest: ["t"],
  realityCheck: { activities: ["x"], misconceptions: ["y"], entryRoutes: ["z"] },
});

const base = (n: number): DiscoveryReport => ({
  id: "r1",
  createdAt: "2026-11-17T10:00:00.000Z",
  locale: "ru",
  demo: true,
  startingPoint: "…",
  patterns: [],
  unnoticed: [],
  directions: Array.from({ length: n }, (_, i) => direction(i)),
  stories: [{ storyId: "demo-no-direction", relevance: "medium", why: [], differences: [] }],
  unexpected: [],
  experiments: [],
  roadmap: { d7: [{ id: "1", text: "t", done: false }], d30: [], d90: [] },
});

describe("reportSchema", () => {
  it("accepts 5 to 8 directions", () => {
    expect(reportSchema.safeParse(base(5)).success).toBe(true);
    expect(reportSchema.safeParse(base(8)).success).toBe(true);
  });
  it("rejects fewer than 5 or more than 8 directions", () => {
    expect(reportSchema.safeParse(base(4)).success).toBe(false);
    expect(reportSchema.safeParse(base(9)).success).toBe(false);
  });
  it("rejects percentage-style relevance", () => {
    const r = base(5) as unknown as { stories: { relevance: unknown }[] };
    r.stories[0].relevance = 87;
    expect(reportSchema.safeParse(r).success).toBe(false);
  });
});
