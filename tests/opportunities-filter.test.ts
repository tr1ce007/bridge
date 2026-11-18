import { describe, expect, it } from "vitest";
import { bundledOpportunities } from "@/lib/data/local-content";
import type { Opportunity } from "@/lib/data/types";
import { OUTDATED_AFTER_DAYS, filterOpportunities, opportunityStatus } from "@/lib/opportunities/filter";

const base: Opportunity = { ...bundledOpportunities[0], status: "verified", verifiedAt: "2026-11-17" };
const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("opportunityStatus (180-day rule)", () => {
  it("is verified on the day and up to 180 days later", () => {
    expect(opportunityStatus(base, day("2026-11-17"))).toBe("verified");
    expect(opportunityStatus(base, day("2027-05-15"))).toBe("verified"); // 179 days
    expect(OUTDATED_AFTER_DAYS).toBe(180);
  });
  it("is outdated after more than 180 days", () => {
    expect(opportunityStatus(base, day("2027-05-16"))).toBe("verified"); // exactly 180 days
    expect(opportunityStatus(base, day("2027-05-17"))).toBe("outdated"); // 181 days
    expect(opportunityStatus(base, day("2030-01-01"))).toBe("outdated");
  });
  it("is unverified without a date or with an unparseable date", () => {
    expect(opportunityStatus({ ...base, verifiedAt: null, status: "unverified" }, day("2026-11-17"))).toBe("unverified");
    expect(opportunityStatus({ ...base, verifiedAt: null, status: "verified" }, day("2026-11-17"))).toBe("unverified");
    expect(opportunityStatus({ ...base, verifiedAt: "not-a-date" }, day("2026-11-17"))).toBe("unverified");
  });
  it("respects a stored status of outdated or unverified", () => {
    expect(opportunityStatus({ ...base, status: "outdated" }, day("2026-11-17"))).toBe("outdated");
    expect(opportunityStatus({ ...base, status: "unverified" }, day("2026-11-17"))).toBe("unverified");
  });
  it("a future verification date is not outdated", () => {
    expect(opportunityStatus({ ...base, verifiedAt: "2027-01-01" }, day("2026-11-17"))).toBe("verified");
  });
});

describe("filterOpportunities", () => {
  const now = day("2026-11-18");
  it("returns all for an empty query", () => {
    expect(filterOpportunities(bundledOpportunities, {}, now)).toHaveLength(bundledOpportunities.length);
  });
  it("filters by type, country, level, cost and status", () => {
    const sch = filterOpportunities(bundledOpportunities, { kind: "scholarship" }, now);
    expect(sch.length).toBeGreaterThan(0);
    expect(sch.every((o) => o.kind === "scholarship")).toBe(true);
    // Bolashak is a state scholarship for study abroad: its country is "international", not Kazakhstan.
    expect(filterOpportunities(bundledOpportunities, { country: "kazakhstan" }, now)).toEqual([]);
    expect(filterOpportunities(bundledOpportunities, { country: "international" }, now).map((o) => o.id)).toEqual(
      expect.arrayContaining(["bolashak", "un-volunteers"]),
    );
    expect(filterOpportunities(bundledOpportunities, { level: "bachelor" }, now).every((o) => o.levels.includes("bachelor") || o.levels.includes("any"))).toBe(true);
    expect(filterOpportunities(bundledOpportunities, { cost: "free" }, now).every((o) => o.cost === "free")).toBe(true);
    // Every bundled entry was checked on its official site on 2026-11-18.
    const checked = day("2026-11-20");
    expect(filterOpportunities(bundledOpportunities, { status: "verified" }, checked)).toHaveLength(bundledOpportunities.length);
    expect(filterOpportunities(bundledOpportunities, { status: "unverified" }, checked)).toEqual([]);
  });
  it("status filter uses the computed status", () => {
    const later = day("2027-12-01");
    const verified = bundledOpportunities.map((o) => ({ ...o, status: "verified" as const, verifiedAt: "2026-11-17" }));
    expect(filterOpportunities(verified, { status: "outdated" }, later).length).toBeGreaterThan(5);
    expect(filterOpportunities(verified, { status: "verified" }, later)).toEqual([]);
  });
  it("searches name and description", () => {
    expect(filterOpportunities(bundledOpportunities, { q: "harvard" }, now).map((o) => o.id)).toEqual(["cs50x"]);
    expect(filterOpportunities(bundledOpportunities, { q: "ERASMUS" }, now).map((o) => o.id)).toEqual(["erasmus-plus"]);
  });
  it("keeps outdated entries (they are shown with a label, not hidden)", () => {
    const later = day("2027-12-01");
    expect(filterOpportunities(bundledOpportunities, {}, later)).toHaveLength(bundledOpportunities.length);
  });
});
