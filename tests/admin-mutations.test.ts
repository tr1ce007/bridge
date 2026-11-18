import { describe, expect, it } from "vitest";
import {
  addStorySource,
  deleteOpportunity,
  markOpportunityVerified,
  moderateStory,
  rejectUnreadableStory,
  removeStorySource,
  resolveReport,
  saveOpportunity,
} from "@/lib/admin/mutations";
import { opportunityInputSchema, storyModerationSchema } from "@/lib/admin/schemas";
import { createMemorySupabase } from "./helpers/memory-supabase";

const NOW = new Date("2026-11-18T10:00:00Z");
const MOD = "22222222-2222-2222-2222-222222222222";
const trio = (s: string) => ({ ru: s, kk: s, en: s });

function seedStories() {
  const db = createMemorySupabase(MOD);
  db.tables.set("stories", [
    { id: "s1", kind: "user", status: "pending", source_url: null, source_name: "Аян", reviewed_by: null, reviewed_at: null, attribution: { ru: "ждёт проверки" } },
    { id: "s2", kind: "user", status: "approved", source_url: null, source_name: null, reviewed_by: null, reviewed_at: null },
  ]);
  return db;
}

describe("rejectUnreadableStory", () => {
  it("sets status rejected and the reviewer on a pending row without reading its content", async () => {
    const db = createMemorySupabase(MOD);
    db.tables.set("stories", [{ id: "bad1", kind: "user", status: "pending", content: { title: null }, reviewed_by: null, reviewed_at: null }]);
    expect(await rejectUnreadableStory(db.client, MOD, "bad1", NOW)).toEqual({ ok: true });
    expect(db.rows("stories")[0]).toMatchObject({ status: "rejected", reviewed_by: MOD, reviewed_at: NOW.toISOString() });
  });

  it("changes nothing when the row is not pending any more", async () => {
    const db = createMemorySupabase(MOD);
    db.tables.set("stories", [{ id: "s2", kind: "user", status: "approved" }]);
    expect(await rejectUnreadableStory(db.client, MOD, "s2", NOW)).toEqual({ ok: false, code: "not_found" });
    expect(db.rows("stories")[0].status).toBe("approved");
  });
});

describe("moderateStory", () => {
  it("approve sets status, kind, source, reviewed_by and reviewed_at, and keeps the note apart", async () => {
    const db = seedStories();
    const input = storyModerationSchema.parse({
      id: "s1",
      decision: "approve",
      kind: "documented",
      sourceUrl: "https://example.com/interview",
      sourceName: "Example Magazine",
      note: "Источник проверен",
    });
    expect(await moderateStory(db.client, MOD, input, NOW)).toEqual({ ok: true });
    const row = db.rows("stories").find((r) => r.id === "s1")!;
    expect(row).toMatchObject({
      status: "approved",
      kind: "documented",
      source_url: "https://example.com/interview",
      source_name: "Example Magazine",
      reviewed_by: MOD,
      reviewed_at: NOW.toISOString(),
    });
    // The attribution no longer says "awaiting review".
    expect(JSON.stringify(row.attribution)).not.toContain("ждёт проверки");
    expect(row).not.toHaveProperty("review_note");
    expect(db.rows("story_reviews")).toEqual([
      { story_id: "s1", decision: "approved", note: "Источник проверен", reviewed_by: MOD, reviewed_at: NOW.toISOString() },
    ]);
  });

  it("approving a user story keeps the author's public name", async () => {
    const db = seedStories();
    const input = storyModerationSchema.parse({ id: "s1", decision: "approve", kind: "user", sourceName: "Кто-то другой" });
    await moderateStory(db.client, MOD, input, NOW);
    const row = db.rows("stories").find((r) => r.id === "s1")!;
    expect(row.kind).toBe("user");
    expect(row.source_name).toBe("Аян");
  });

  it("reject sets status and reviewer without touching kind or source", async () => {
    const db = seedStories();
    const input = storyModerationSchema.parse({ id: "s1", decision: "reject", note: "Содержит личные данные" });
    expect(await moderateStory(db.client, MOD, input, NOW)).toEqual({ ok: true });
    const row = db.rows("stories").find((r) => r.id === "s1")!;
    expect(row).toMatchObject({ status: "rejected", kind: "user", source_url: null, reviewed_by: MOD, reviewed_at: NOW.toISOString() });
    expect(db.rows("story_reviews")[0]).toMatchObject({ decision: "rejected", note: "Содержит личные данные" });
  });

  it("only pending stories can be moderated", async () => {
    const db = seedStories();
    const input = storyModerationSchema.parse({ id: "s2", decision: "reject" });
    expect(await moderateStory(db.client, MOD, input, NOW)).toEqual({ ok: false, code: "not_found" });
    expect(db.rows("stories").find((r) => r.id === "s2")!.status).toBe("approved");
    expect(db.rows("story_reviews")).toEqual([]);
  });
});

describe("moderateStory: two writes", () => {
  /** A client whose update of `stories` fails (or matches no row) after the note was written. */
  function breakStoryUpdate(db: ReturnType<typeof createMemorySupabase>, mode: "error" | "empty") {
    const real = db.client.from.bind(db.client);
    return {
      ...db.client,
      from: (table: string) => {
        const builder = real(table) as unknown as Record<string, unknown>;
        if (table !== "stories") return builder;
        return {
          ...builder,
          update: () => {
            const chain: Record<string, unknown> = {
              eq: () => chain,
              select: () => Promise.resolve(mode === "error" ? { data: null, error: { message: "boom" } } : { data: [], error: null }),
            };
            return chain;
          },
        };
      },
    } as unknown as typeof db.client;
  }

  it("saves the note first, then updates the story", async () => {
    const db = seedStories();
    const input = storyModerationSchema.parse({ id: "s1", decision: "reject", note: "n" });
    await moderateStory(db.client, MOD, input, NOW);
    expect(db.writes.indexOf("upsert:story_reviews")).toBeLessThan(db.writes.indexOf("update:stories"));
  });

  it("reports honestly when the story update fails after the note was saved", async () => {
    for (const mode of ["error", "empty"] as const) {
      const db = seedStories();
      const input = storyModerationSchema.parse({ id: "s1", decision: "approve", kind: "user", note: "ok" });
      expect(await moderateStory(breakStoryUpdate(db, mode), MOD, input, NOW)).toEqual({ ok: false, code: "partial" });
      // the story was not published
      expect(db.rows("stories").find((r) => r.id === "s1")!.status).toBe("pending");
    }
  });
});

describe("resolveReport", () => {
  const ID = "6f1b3c0e-8a52-4a5e-9a7d-0d6f6b0f2a11";
  it("sets status, resolved_by and resolved_at on an open report only", async () => {
    const db = createMemorySupabase(MOD);
    db.tables.set("content_reports", [{ id: ID, status: "open", resolved_by: null, resolved_at: null }]);
    expect(await resolveReport(db.client, MOD, { id: ID, resolution: "dismissed" }, NOW)).toEqual({ ok: true });
    expect(db.rows("content_reports")[0]).toEqual({ id: ID, status: "dismissed", resolved_by: MOD, resolved_at: NOW.toISOString() });
    // A second click on an already closed report changes nothing.
    expect(await resolveReport(db.client, MOD, { id: ID, resolution: "resolved" }, NOW)).toEqual({ ok: false, code: "not_found" });
    expect(db.rows("content_reports")[0].status).toBe("dismissed");
  });
});

describe("opportunities", () => {
  const base = {
    name: "Example Scholarship",
    kind: "scholarship" as const,
    levels: ["master" as const],
    country: "germany" as const,
    cost: "free" as const,
    description: trio("Описание"),
    eligibility: trio("Условия"),
    url: "https://example.org/s",
    deadline: "",
    source: "официальная страница",
    status: "unverified" as const,
    verifiedAt: "",
  };

  it("create stores a row with a null deadline and never invents one", async () => {
    const db = createMemorySupabase(MOD);
    const input = opportunityInputSchema.parse(base);
    const res = await saveOpportunity(db.client, input, { mode: "create" });
    expect(res).toEqual({ ok: true, id: "example-scholarship" });
    expect(db.rows("opportunities")[0]).toMatchObject({
      id: "example-scholarship",
      name: "Example Scholarship",
      deadline: null,
      verified_at: null,
      status: "unverified",
      source: "официальная страница",
      url: "https://example.org/s",
    });
  });

  it("update changes the row but never its id", async () => {
    const db = createMemorySupabase(MOD);
    await saveOpportunity(db.client, opportunityInputSchema.parse(base), { mode: "create" });
    const input = opportunityInputSchema.parse({ ...base, name: "Renamed", deadline: "2027-03-01" });
    expect(await saveOpportunity(db.client, input, { mode: "update", id: "example-scholarship" })).toEqual({ ok: true, id: "example-scholarship" });
    expect(db.rows("opportunities")).toHaveLength(1);
    expect(db.rows("opportunities")[0]).toMatchObject({ id: "example-scholarship", name: "Renamed", deadline: "2027-03-01" });
    expect(await saveOpportunity(db.client, input, { mode: "update", id: "missing" })).toEqual({ ok: false, code: "not_found" });
  });

  it("mark verified today sets only verified_at and status (the deadline stays as it was)", async () => {
    const db = createMemorySupabase(MOD);
    db.tables.set("opportunities", [{ id: "o1", status: "outdated", verified_at: "2025-01-01", deadline: null, name: "X" }]);
    expect(await markOpportunityVerified(db.client, "o1", "2026-11-18")).toEqual({ ok: true });
    expect(db.rows("opportunities")[0]).toEqual({ id: "o1", status: "verified", verified_at: "2026-11-18", deadline: null, name: "X" });
    expect(await markOpportunityVerified(db.client, "nope", "2026-11-18")).toEqual({ ok: false, code: "not_found" });
  });

  it("delete removes the row", async () => {
    const db = createMemorySupabase(MOD);
    db.tables.set("opportunities", [{ id: "o1" }, { id: "o2" }]);
    expect(await deleteOpportunity(db.client, "o1")).toEqual({ ok: true });
    expect(db.rows("opportunities")).toEqual([{ id: "o2" }]);
    // Deleting something that is not there (already deleted, or hidden by RLS) is reported, not "ok".
    expect(await deleteOpportunity(db.client, "o1")).toEqual({ ok: false, code: "not_found" });
    expect(db.rows("opportunities")).toEqual([{ id: "o2" }]);
  });
});

describe("story sources", () => {
  it("adds a source without a story and removes it", async () => {
    const db = createMemorySupabase(MOD);
    expect(await addStorySource(db.client, { url: "https://example.com/feed.xml", name: "Feed", kind: "rss", note: "weekly" })).toEqual({ ok: true });
    expect(db.rows("story_sources")).toEqual([{ url: "https://example.com/feed.xml", name: "Feed", kind: "rss", note: "weekly" }]);
    db.rows("story_sources")[0].id = "src1";
    expect(await removeStorySource(db.client, "src1")).toEqual({ ok: true });
    expect(db.rows("story_sources")).toEqual([]);
    expect(await removeStorySource(db.client, "src1")).toEqual({ ok: false, code: "not_found" });
  });

  it("does not remove a source that belongs to a story (provenance), and says so", async () => {
    const db = createMemorySupabase(MOD);
    db.tables.set("story_sources", [{ id: "p1", story_id: "s1", url: "https://e.com" }]);
    expect(await removeStorySource(db.client, "p1")).toEqual({ ok: false, code: "not_found" });
    expect(db.rows("story_sources")).toHaveLength(1);
  });
});
