import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ exchange: vi.fn(), throws: false }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => {
    if (state.throws) throw new Error("boom");
    return { auth: { exchangeCodeForSession: state.exchange } };
  },
}));

import { GET } from "@/app/auth/callback/route";
import { callbackLocale, callbackOrigin, isAuthErrorParam } from "@/lib/auth/callback";

const call = (qs: string) => GET(new NextRequest(`http://localhost:3000/auth/callback${qs}`));
const where = (res: Response) => {
  const u = new URL(res.headers.get("location")!);
  return u.pathname + u.search;
};

beforeEach(() => {
  state.exchange.mockReset();
  state.exchange.mockResolvedValue({ error: null });
  state.throws = false;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /auth/callback", () => {
  it("exchanges the code and redirects to the locale dashboard", async () => {
    const res = await call("?code=abc&locale=kk");
    expect(state.exchange).toHaveBeenCalledWith("abc");
    expect(where(res)).toBe("/kk/dashboard");
  });

  it("falls back to ru for an unknown locale", async () => {
    expect(where(await call("?code=abc&locale=de"))).toBe("/ru/dashboard");
    expect(where(await call("?code=abc"))).toBe("/ru/dashboard");
  });

  it("never redirects off-site (a `next` or host parameter is ignored)", async () => {
    const res = await call("?code=abc&locale=en&next=https://evil.example/&redirect_to=//evil.example");
    const u = new URL(res.headers.get("location")!);
    expect(u.origin).toBe("http://localhost:3000");
    expect(u.pathname).toBe("/en/dashboard");
  });

  it("a rejected code goes to the localized auth page with an error param", async () => {
    state.exchange.mockResolvedValue({ error: { message: "code verifier missing" } });
    expect(where(await call("?code=abc&locale=en"))).toBe("/en/auth?error=link_invalid");
  });

  it("a missing code or a provider error goes to the auth page", async () => {
    expect(where(await call("?locale=kk"))).toBe("/kk/auth?error=link_invalid");
    expect(where(await call("?error=access_denied&error_description=x&locale=ru"))).toBe("/ru/auth?error=link_invalid");
    expect(state.exchange).not.toHaveBeenCalled();
  });

  it("an unexpected failure is reported, not thrown", async () => {
    state.throws = true;
    expect(where(await call("?code=abc&locale=ru"))).toBe("/ru/auth?error=failed");
  });

  it("without Supabase it never tries to sign in", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(where(await call("?code=abc&locale=ru"))).toBe("/ru/auth?error=unconfigured");
    expect(state.exchange).not.toHaveBeenCalled();
  });
});

describe("redirect origin behind a proxy (NEXT_PUBLIC_SITE_URL)", () => {
  it("uses the site url instead of the request origin when it is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://thebridge.example/");
    const ok = await call("?code=abc&locale=kk");
    expect(ok.headers.get("location")).toBe("https://thebridge.example/kk/dashboard");
    const bad = await call("?locale=en");
    expect(bad.headers.get("location")).toBe("https://thebridge.example/en/auth?error=link_invalid");
  });

  it("still adds no `next` parameter and keeps the locale check", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://thebridge.example");
    const res = await call("?code=abc&locale=xx&next=https://evil.example/");
    expect(res.headers.get("location")).toBe("https://thebridge.example/ru/dashboard");
  });

  it("falls back to the request origin when it is unset or not a web address", () => {
    expect(callbackOrigin("http://localhost:3000/auth/callback?code=a", undefined)).toBe("http://localhost:3000");
    expect(callbackOrigin("http://localhost:3000/auth/callback", "")).toBe("http://localhost:3000");
    expect(callbackOrigin("http://localhost:3000/auth/callback", "javascript:alert(1)")).toBe("http://localhost:3000");
    expect(callbackOrigin("http://localhost:3000/auth/callback", "not a url")).toBe("http://localhost:3000");
    expect(callbackOrigin("http://localhost:3000/x", "https://thebridge.example/some/path")).toBe("https://thebridge.example");
  });
});

describe("callback helpers", () => {
  it("validates locale and error params", () => {
    expect(callbackLocale("kk")).toBe("kk");
    expect(callbackLocale("xx")).toBe("ru");
    expect(callbackLocale(null)).toBe("ru");
    expect(isAuthErrorParam("link_invalid")).toBe(true);
    expect(isAuthErrorParam("<script>")).toBe(false);
  });
});
