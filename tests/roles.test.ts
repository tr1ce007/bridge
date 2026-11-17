import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  configured: true,
  user: null as { id: string; email: string | null } | null,
  getUserError: null as { message: string } | null,
  role: undefined as string | undefined | null,
  clientCreated: 0,
}));

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => state.configured }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => {
    state.clientCreated += 1;
    return {
      auth: {
        getUser: async () => ({ data: { user: state.user }, error: state.getUserError }),
        // The role check must never trust the cookie session.
        getSession: async () => {
          throw new Error("getSession must not be used for authorization");
        },
      },
      from: (table: string) => {
        expect(table).toBe("profiles");
        const builder = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: async () => ({ data: state.role === undefined ? null : { role: state.role }, error: null }),
        };
        return builder;
      },
    };
  },
}));

import { AuthError, getSessionUser, requireRole } from "@/lib/auth/roles";

beforeEach(() => {
  state.configured = true;
  state.user = { id: "u1", email: "a@example.com" };
  state.getUserError = null;
  state.role = "user";
  state.clientCreated = 0;
});

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof AuthError) return e.code;
    throw e;
  }
  return "allowed";
}

describe("requireRole", () => {
  it("requireRole denies user", async () => {
    state.role = "user";
    expect(await codeOf(requireRole(["admin", "moderator"]))).toBe("forbidden");
  });

  it("allows moderator", async () => {
    state.role = "moderator";
    const user = await requireRole(["admin", "moderator"]);
    expect(user).toEqual({ id: "u1", email: "a@example.com", role: "moderator" });
  });

  it("allows admin", async () => {
    state.role = "admin";
    expect((await requireRole(["admin", "moderator"])).role).toBe("admin");
    expect((await requireRole(["admin"])).role).toBe("admin");
  });

  it("denies a moderator on an admin-only section", async () => {
    state.role = "moderator";
    expect(await codeOf(requireRole(["admin"]))).toBe("forbidden");
  });

  it("denies when unauthenticated", async () => {
    state.user = null;
    expect(await codeOf(requireRole(["admin", "moderator"]))).toBe("unauthenticated");
  });

  it("denies when the auth server rejects the session", async () => {
    state.getUserError = { message: "invalid JWT" };
    state.user = { id: "u1", email: null };
    expect(await codeOf(requireRole(["admin"]))).toBe("unauthenticated");
  });

  it("denies when Supabase is not configured, without creating a client", async () => {
    state.configured = false;
    state.role = "admin";
    expect(await codeOf(requireRole(["admin", "moderator"]))).toBe("unconfigured");
    expect(state.clientCreated).toBe(0);
  });

  it("treats a missing profile or an unknown role as no access", async () => {
    state.role = undefined;
    expect(await codeOf(requireRole(["admin", "moderator"]))).toBe("forbidden");
    state.role = "superuser";
    expect(await codeOf(requireRole(["admin", "moderator"]))).toBe("forbidden");
  });

  it("an empty role list denies everybody", async () => {
    state.role = "admin";
    expect(await codeOf(requireRole([]))).toBe("forbidden");
  });
});

describe("getSessionUser", () => {
  it("returns null without Supabase or without a user", async () => {
    state.configured = false;
    expect(await getSessionUser()).toBeNull();
    state.configured = true;
    state.user = null;
    expect(await getSessionUser()).toBeNull();
  });

  it("returns id, email and role (plain user by default)", async () => {
    state.role = null;
    expect(await getSessionUser()).toEqual({ id: "u1", email: "a@example.com", role: "user" });
  });
});
