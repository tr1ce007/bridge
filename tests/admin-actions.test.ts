import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemorySupabase } from "./helpers/memory-supabase";

const state = vi.hoisted(() => ({
  role: "user" as "user" | "moderator" | "admin" | null,
  clientRequests: 0,
  db: null as unknown,
  redirected: null as unknown,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  redirect: (arg: unknown) => {
    state.redirected = arg;
    throw new Error("NEXT_REDIRECT");
  },
}));
vi.mock("@/lib/auth/roles", async () => {
  class AuthError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  }
  return {
    AuthError,
    requireRole: async (roles: string[]) => {
      if (state.role === null) throw new AuthError("unauthenticated");
      if (state.role === "user" || !roles.includes(state.role)) throw new AuthError("forbidden");
      return { id: "mod-1", email: "m@example.com", role: state.role };
    },
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => {
    state.clientRequests += 1;
    return (state.db as ReturnType<typeof createMemorySupabase>).client;
  },
}));

import {
  addStorySourceAction,
  deleteOpportunityAction,
  markOpportunityVerifiedAction,
  moderateStoryAction,
  rejectUnreadableStoryAction,
  removeStorySourceAction,
  resolveReportAction,
  saveOpportunityAction,
} from "@/lib/admin/actions";
import { IDLE } from "@/lib/admin/action-state";

const form = (o: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(o)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
};

const opportunityForm = {
  name: "Example Scholarship",
  kind: "scholarship",
  levels: ["master"],
  country: "germany",
  cost: "free",
  description_ru: "а",
  description_kk: "ә",
  description_en: "a",
  eligibility_ru: "б",
  eligibility_kk: "б",
  eligibility_en: "b",
  url: "https://example.org",
  deadline: "",
  source: "",
  status: "unverified",
  verifiedAt: "",
  locale: "kk",
};

const REPORT = "6f1b3c0e-8a52-4a5e-9a7d-0d6f6b0f2a11";

beforeEach(() => {
  state.role = "moderator";
  state.clientRequests = 0;
  state.redirected = null;
  const db = createMemorySupabase("mod-1");
  db.tables.set("stories", [{ id: "s1", kind: "user", status: "pending", source_url: null }]);
  db.tables.set("content_reports", [{ id: REPORT, status: "open" }]);
  db.tables.set("opportunities", [{ id: "o1", status: "unverified" }]);
  db.tables.set("story_sources", [{ id: "src1", url: "https://e.com" }]);
  state.db = db;
});

const actions = [
  ["moderateStory", () => moderateStoryAction(IDLE, form({ id: "s1", decision: "reject" }))],
  ["rejectUnreadableStory", () => rejectUnreadableStoryAction(IDLE, form({ id: "s1" }))],
  ["resolveReport", () => resolveReportAction(IDLE, form({ id: REPORT, resolution: "resolved" }))],
  ["saveOpportunity", () => saveOpportunityAction(IDLE, form(opportunityForm))],
  ["markVerified", () => markOpportunityVerifiedAction(IDLE, form({ id: "o1" }))],
  ["deleteOpportunity", () => deleteOpportunityAction(IDLE, form({ id: "o1" }))],
  ["addSource", () => addStorySourceAction(IDLE, form({ url: "https://example.com/feed", name: "Feed", kind: "rss" }))],
  ["removeSource", () => removeStorySourceAction(IDLE, form({ id: "src1" }))],
] as const;

describe("every admin action calls requireRole first", () => {
  for (const [name, run] of actions) {
    it(`${name}: a plain user is denied and nothing is written`, async () => {
      state.role = "user";
      expect(await run()).toEqual({ status: "error", code: "forbidden" });
      expect((state.db as ReturnType<typeof createMemorySupabase>).writes).toEqual([]);
      expect(state.clientRequests).toBe(0);
    });

    it(`${name}: a signed-out visitor is denied and nothing is written`, async () => {
      state.role = null;
      expect(await run()).toEqual({ status: "error", code: "unauthenticated" });
      expect((state.db as ReturnType<typeof createMemorySupabase>).writes).toEqual([]);
    });
  }

  it("a moderator may moderate", async () => {
    expect(await moderateStoryAction(IDLE, form({ id: "s1", decision: "reject" }))).toEqual({ status: "ok", message: "rejected" });
  });
});

describe("rejectUnreadableStoryAction", () => {
  it("rejects a pending row and writes only to stories", async () => {
    expect(await rejectUnreadableStoryAction(IDLE, form({ id: "s1" }))).toEqual({ status: "ok", message: "rejected" });
    const db = state.db as ReturnType<typeof createMemorySupabase>;
    expect(db.rows("stories")[0].status).toBe("rejected");
    expect(db.writes).toEqual(["update:stories"]);
  });

  it("refuses an empty id before anything is written", async () => {
    expect(await rejectUnreadableStoryAction(IDLE, form({ id: "  " }))).toEqual({ status: "error", code: "invalid" });
    expect((state.db as ReturnType<typeof createMemorySupabase>).writes).toEqual([]);
  });
});

describe("input is validated before anything is written", () => {
  it("documented without a source url is refused", async () => {
    const res = await moderateStoryAction(IDLE, form({ id: "s1", decision: "approve", kind: "documented" }));
    expect(res).toEqual({ status: "error", code: "invalid", fields: ["sourceUrl"] });
    expect((state.db as ReturnType<typeof createMemorySupabase>).writes).toEqual([]);
  });

  it("javascript: source and opportunity urls are refused", async () => {
    const a = await moderateStoryAction(IDLE, form({ id: "s1", decision: "approve", kind: "verified", sourceUrl: "javascript:alert(1)" }));
    expect(a.status === "error" && a.code).toBe("invalid");
    const b = await saveOpportunityAction(IDLE, form({ ...opportunityForm, url: "javascript:alert(1)" }));
    expect(b).toMatchObject({ status: "error", code: "invalid", fields: ["url"] });
    const c = await addStorySourceAction(IDLE, form({ url: "data:text/html,x", name: "Bad", kind: "rss" }));
    expect(c).toMatchObject({ status: "error", code: "invalid" });
    expect((state.db as ReturnType<typeof createMemorySupabase>).writes).toEqual([]);
  });

  it("creating an opportunity redirects to the list in the form's locale", async () => {
    await expect(saveOpportunityAction(IDLE, form(opportunityForm))).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirected).toEqual({ href: "/admin/opportunities", locale: "kk" });
  });
});
