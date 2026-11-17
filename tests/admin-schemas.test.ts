import { describe, expect, it } from "vitest";
import {
  opportunityInputSchema,
  reportResolutionSchema,
  storyModerationSchema,
  storySourceInputSchema,
  slugifyOpportunityId,
} from "@/lib/admin/schemas";

const REPORT_ID = "6f1b3c0e-8a52-4a5e-9a7d-0d6f6b0f2a11";

describe("storyModerationSchema", () => {
  it("requires a source URL for documented and verified stories", () => {
    for (const kind of ["documented", "verified"] as const) {
      const r = storyModerationSchema.safeParse({ id: "s1", decision: "approve", kind });
      expect(r.success, kind).toBe(false);
      const ok = storyModerationSchema.safeParse({ id: "s1", decision: "approve", kind, sourceUrl: "https://example.com/a" });
      expect(ok.success, kind).toBe(true);
    }
  });

  it("does not require a source for user stories", () => {
    expect(storyModerationSchema.safeParse({ id: "s1", decision: "approve", kind: "user" }).success).toBe(true);
  });

  it("rejects javascript: and data: source URLs", () => {
    for (const sourceUrl of ["javascript:alert(1)", "data:text/html,x"]) {
      expect(storyModerationSchema.safeParse({ id: "s1", decision: "approve", kind: "documented", sourceUrl }).success).toBe(false);
      expect(storyModerationSchema.safeParse({ id: "s1", decision: "approve", kind: "user", sourceUrl }).success).toBe(false);
    }
  });

  it("staff cannot make a story 'demo' or invent kinds", () => {
    expect(storyModerationSchema.safeParse({ id: "s1", decision: "approve", kind: "demo" }).success).toBe(false);
    expect(storyModerationSchema.safeParse({ id: "s1", decision: "approve", kind: "official" }).success).toBe(false);
  });

  it("a rejection does not need kind or source", () => {
    const r = storyModerationSchema.safeParse({ id: "s1", decision: "reject", note: "  дубликат <b>истории</b> " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.note).toBe("дубликат истории");
  });

  it("limits the note and rejects unknown decisions", () => {
    expect(storyModerationSchema.safeParse({ id: "s1", decision: "reject", note: "x".repeat(1001) }).success).toBe(false);
    expect(storyModerationSchema.safeParse({ id: "s1", decision: "delete", kind: "user" }).success).toBe(false);
  });

  it("turns an empty note into undefined", () => {
    const r = storyModerationSchema.parse({ id: "s1", decision: "approve", kind: "user", note: "   " });
    expect(r.note).toBeUndefined();
  });
});

describe("reportResolutionSchema", () => {
  it("accepts resolved and dismissed only", () => {
    expect(reportResolutionSchema.safeParse({ id: REPORT_ID, resolution: "resolved" }).success).toBe(true);
    expect(reportResolutionSchema.safeParse({ id: REPORT_ID, resolution: "dismissed" }).success).toBe(true);
    expect(reportResolutionSchema.safeParse({ id: REPORT_ID, resolution: "open" }).success).toBe(false);
    expect(reportResolutionSchema.safeParse({ id: "not-a-uuid", resolution: "resolved" }).success).toBe(false);
  });
});

const trio = (s: string) => ({ ru: s, kk: s, en: s });
const validOpportunity = {
  name: "Example Scholarship",
  kind: "scholarship",
  levels: ["master"],
  country: "germany",
  cost: "free",
  description: trio("Описание"),
  eligibility: trio("Условия"),
  url: "https://example.org/scholarship",
  deadline: null,
  source: "https://example.org/scholarship/apply",
  status: "unverified",
  verifiedAt: null,
};

describe("opportunityInputSchema", () => {
  it("accepts a valid opportunity and keeps the deadline null when empty", () => {
    const r = opportunityInputSchema.safeParse({ ...validOpportunity, deadline: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.deadline).toBeNull();
  });

  it("accepts only real calendar dates as a deadline", () => {
    expect(opportunityInputSchema.safeParse({ ...validOpportunity, deadline: "2027-03-01" }).success).toBe(true);
    expect(opportunityInputSchema.safeParse({ ...validOpportunity, deadline: "2027-02-31" }).success).toBe(false);
    expect(opportunityInputSchema.safeParse({ ...validOpportunity, deadline: "next spring" }).success).toBe(false);
  });

  it("requires http(s) urls", () => {
    expect(opportunityInputSchema.safeParse({ ...validOpportunity, url: "javascript:alert(1)" }).success).toBe(false);
    expect(opportunityInputSchema.safeParse({ ...validOpportunity, url: "data:text/html,x" }).success).toBe(false);
  });

  it("status verified needs a verification date", () => {
    expect(opportunityInputSchema.safeParse({ ...validOpportunity, status: "verified", verifiedAt: null }).success).toBe(false);
    expect(opportunityInputSchema.safeParse({ ...validOpportunity, status: "verified", verifiedAt: "2026-11-18" }).success).toBe(true);
  });

  it("requires every language and at least one level", () => {
    expect(opportunityInputSchema.safeParse({ ...validOpportunity, description: { ...trio("x"), kk: "" } }).success).toBe(false);
    expect(opportunityInputSchema.safeParse({ ...validOpportunity, levels: [] }).success).toBe(false);
    expect(opportunityInputSchema.safeParse({ ...validOpportunity, kind: "lottery" }).success).toBe(false);
  });

  it("strips markup from text fields", () => {
    const r = opportunityInputSchema.parse({ ...validOpportunity, name: "Prog <script>alert(1)</script>ram", description: trio("<b>Bold</b> text") });
    expect(r.name).toBe("Prog ram");
    expect(r.description.ru).toBe("Bold text");
  });
});

describe("slugifyOpportunityId", () => {
  it("makes a url-safe id from a Latin name and falls back for other scripts", () => {
    expect(slugifyOpportunityId("Chevening Scholarships 2027!")).toBe("chevening-scholarships-2027");
    expect(slugifyOpportunityId("Болашақ")).toMatch(/^opp-[a-z0-9]+$/);
  });
});

describe("storySourceInputSchema", () => {
  it("needs an http(s) url, a name and a known kind", () => {
    const ok = { url: "https://example.com/feed.xml", name: "Example feed", kind: "rss", note: "weekly" };
    expect(storySourceInputSchema.safeParse(ok).success).toBe(true);
    expect(storySourceInputSchema.safeParse({ ...ok, url: "javascript:x" }).success).toBe(false);
    expect(storySourceInputSchema.safeParse({ ...ok, name: "" }).success).toBe(false);
    expect(storySourceInputSchema.safeParse({ ...ok, kind: "telepathy" }).success).toBe(false);
    expect(storySourceInputSchema.safeParse({ ...ok, note: "x".repeat(501) }).success).toBe(false);
  });
});
