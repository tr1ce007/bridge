import { describe, expect, it } from "vitest";
import { recentOpportunities } from "@/lib/dashboard/opportunities";
import type { Opportunity } from "@/lib/data/types";

const opp = (id: string, verifiedAt: string | null, status: Opportunity["status"] = "verified"): Opportunity => ({
  id,
  name: id,
  kind: "course",
  levels: ["any"],
  country: "online",
  cost: "free",
  description: { ru: "d", kk: "d", en: "d" },
  eligibility: { ru: "e", kk: "e", en: "e" },
  url: "https://example.org",
  deadline: null,
  verifiedAt,
  status,
});

const NOW = new Date("2026-11-18T00:00:00Z");

describe("recentOpportunities", () => {
  const all = [opp("a", "2026-11-01"), opp("b", "2026-11-17"), opp("c", "2026-11-10"), opp("d", "2026-11-12"), opp("n", null, "unverified")];

  it("shows saved opportunities first when there are any", () => {
    const out = recentOpportunities(all, ["c", "a"], NOW);
    expect(out.source).toBe("saved");
    expect(out.items.map((o) => o.id)).toEqual(["a", "c"]); // most recently saved first
  });

  it("otherwise shows the 3 most recently verified", () => {
    const out = recentOpportunities(all, [], NOW);
    expect(out.source).toBe("recent");
    expect(out.items.map((o) => o.id)).toEqual(["b", "d", "c"]);
  });

  it("skips saved ids that no longer exist and falls back when none are left", () => {
    expect(recentOpportunities(all, ["gone"], NOW).source).toBe("recent");
  });

  it("never shows outdated entries (180-day rule) and never invents verification dates", () => {
    const old = [opp("old", "2025-01-01"), opp("flag", "2026-11-17", "outdated"), opp("ok", "2026-11-16")];
    expect(recentOpportunities(old, [], NOW).items.map((o) => o.id)).toEqual(["ok"]);
  });
});
