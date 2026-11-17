import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ssr = vi.hoisted(() => ({
  calls: 0,
  /** What the fake Supabase client "refreshes": cookies it asks the proxy to set. */
  refreshTo: [] as { name: string; value: string; options: Record<string, unknown> }[],
  throws: false,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: { getAll: () => unknown[]; setAll: (c: unknown[], h: Record<string, string>) => void } }) => ({
    auth: {
      getClaims: async () => {
        ssr.calls += 1;
        if (ssr.throws) throw new Error("auth server down");
        if (ssr.refreshTo.length) opts.cookies.setAll(ssr.refreshTo, { "Cache-Control": "private, no-store" });
        return { data: { claims: {} }, error: null };
      },
    },
  }),
}));

import proxy, { config } from "@/proxy";
import { hasAuthCookie } from "@/lib/supabase/proxy-session";

const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost${path}`, cookie ? { headers: { cookie } } : undefined);

beforeEach(() => {
  ssr.calls = 0;
  ssr.refreshTo = [];
  ssr.throws = false;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
});
afterEach(() => vi.unstubAllEnvs());

describe("proxy: locale routing is unchanged", () => {
  it("redirects / to the default locale", async () => {
    const res = await proxy(req("/"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/ru");
  });

  it("passes locale-prefixed deep pages through", async () => {
    for (const path of ["/ru", "/kk", "/en", "/kk/stories", "/en/stories/demo-changed-major", "/ru/admin/opportunities"]) {
      const res = await proxy(req(path));
      expect(res.status, path).toBe(200);
      expect(res.headers.get("location"), path).toBeNull();
    }
  });

  it("redirects an unprefixed deep page to the default locale", async () => {
    const res = await proxy(req("/stories"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/ru/stories");
  });

  it("does not run on the auth callback, api, assets", () => {
    const re = new RegExp(`^${config.matcher.replace(/^\//, "\\/")}$`);
    expect(re.test("/auth/callback")).toBe(false);
    expect(re.test("/api/stories")).toBe(false);
    expect(re.test("/icon.png")).toBe(false);
    expect(re.test("/ru/auth")).toBe(true);
    expect(re.test("/ru/admin")).toBe(true);
    expect(re.test("/")).toBe(true);
  });
});

describe("proxy: session refresh", () => {
  it("does not call Supabase for guests", async () => {
    await proxy(req("/ru/dashboard"));
    expect(ssr.calls).toBe(0);
  });

  it("does not call Supabase when it is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await proxy(req("/ru/dashboard", "sb-abc-auth-token=xyz"));
    expect(ssr.calls).toBe(0);
  });

  it("refreshes the session for a visitor with auth cookies and sets the new cookies on the response", async () => {
    ssr.refreshTo = [{ name: "sb-abc-auth-token", value: "fresh", options: { path: "/", httpOnly: false, maxAge: 400 } }];
    const res = await proxy(req("/kk/dashboard", "sb-abc-auth-token=stale"));
    expect(ssr.calls).toBe(1);
    expect(res.status).toBe(200);
    expect(res.cookies.get("sb-abc-auth-token")?.value).toBe("fresh");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("refreshes cookies on a locale redirect too", async () => {
    ssr.refreshTo = [{ name: "sb-abc-auth-token", value: "fresh", options: { path: "/" } }];
    const res = await proxy(req("/stories", "sb-abc-auth-token=stale"));
    expect(res.status).toBe(307);
    expect(res.cookies.get("sb-abc-auth-token")?.value).toBe("fresh");
  });

  it("keeps routing when Supabase fails", async () => {
    ssr.throws = true;
    const res = await proxy(req("/en/stories", "sb-abc-auth-token=stale"));
    expect(res.status).toBe(200);
  });
});

describe("hasAuthCookie", () => {
  it("recognises chunked and plain Supabase auth cookies only", () => {
    expect(hasAuthCookie(req("/", "sb-abc-auth-token=1"))).toBe(true);
    expect(hasAuthCookie(req("/", "sb-abc-auth-token.0=1; sb-abc-auth-token.1=2"))).toBe(true);
    expect(hasAuthCookie(req("/", "sb-abc-auth-token-code-verifier=1"))).toBe(true);
    expect(hasAuthCookie(req("/", "theme=dark"))).toBe(false);
    expect(hasAuthCookie(req("/"))).toBe(false);
  });
});
