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
import { callbackLocale, isAuthErrorParam } from "@/lib/auth/callback";

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

describe("callback helpers", () => {
  it("validates locale and error params", () => {
    expect(callbackLocale("kk")).toBe("kk");
    expect(callbackLocale("xx")).toBe("ru");
    expect(callbackLocale(null)).toBe("ru");
    expect(isAuthErrorParam("link_invalid")).toBe(true);
    expect(isAuthErrorParam("<script>")).toBe(false);
  });
});
