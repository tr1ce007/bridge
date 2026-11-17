import { describe, expect, it } from "vitest";
import { getOverviewCounts, splitFailureKind } from "@/lib/admin/queries";
import { createMemorySupabase } from "./helpers/memory-supabase";

describe("getOverviewCounts", () => {
  const now = new Date("2026-11-18T10:00:00Z");

  it("counts pending stories, open reports, opportunities to verify and AI failures of the last 7 days", async () => {
    const db = createMemorySupabase("mod");
    db.tables.set("stories", [{ status: "pending" }, { status: "pending" }, { status: "approved" }, { status: "rejected" }]);
    db.tables.set("content_reports", [{ status: "open" }, { status: "resolved" }, { status: "dismissed" }]);
    db.tables.set("opportunities", [
      { status: "verified", verified_at: "2026-11-01" }, // fresh
      { status: "verified", verified_at: "2026-01-01" }, // older than 180 days -> outdated
      { status: "unverified", verified_at: null },
      { status: "outdated", verified_at: "2026-10-01" },
    ]);
    db.tables.set("ai_failures", [
      { created_at: "2026-11-17T00:00:00Z" },
      { created_at: "2026-11-12T00:00:00Z" },
      { created_at: "2026-11-01T00:00:00Z" }, // too old
    ]);
    expect(await getOverviewCounts(db.client, now)).toEqual({
      pendingStories: 2,
      openReports: 1,
      opportunitiesToVerify: 3,
      aiFailuresLast7Days: 2,
    });
  });

  it("is all zeros on an empty database", async () => {
    const db = createMemorySupabase("mod");
    expect(await getOverviewCounts(db.client, now)).toEqual({ pendingStories: 0, openReports: 0, opportunitiesToVerify: 0, aiFailuresLast7Days: 0 });
  });
});

describe("splitFailureKind", () => {
  it("splits '<route>:<kind>'", () => {
    expect(splitFailureKind("report:timeout")).toEqual({ route: "report", kind: "timeout" });
    expect(splitFailureKind("whatif:schema:extra")).toEqual({ route: "whatif", kind: "schema:extra" });
    expect(splitFailureKind("timeout")).toEqual({ route: "", kind: "timeout" });
  });
});
