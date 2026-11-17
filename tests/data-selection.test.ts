import { afterEach, describe, expect, it, vi } from "vitest";
import { getContent, getUserStore, isSupabaseConfigured } from "@/lib/data";

afterEach(() => vi.unstubAllEnvs());

describe("adapter selection", () => {
  it("uses local stores when Supabase variables are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);
    expect(getUserStore().mode).toBe("local");
    expect(getContent().mode).toBe("local");
  });

  it("stays local when only one variable is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);
    expect(getUserStore().mode).toBe("local");
  });

  it("uses Supabase when both variables are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    expect(isSupabaseConfigured()).toBe(true);
    expect(getUserStore().mode).toBe("supabase");
    expect(getContent().mode).toBe("supabase");
  });

  it("returns the same instance on repeated calls", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(getUserStore()).toBe(getUserStore());
    expect(getContent()).toBe(getContent());
  });
});
