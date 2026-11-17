import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const inserts: { table: string; row: unknown }[] = [];
const serviceClientCalls = vi.hoisted(() => ({ count: 0, fail: false }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => {
    serviceClientCalls.count += 1;
    return {
      from: (table: string) => ({
        insert: async (row: unknown) => {
          if (serviceClientCalls.fail) throw new Error("db down");
          inserts.push({ table, row });
          return { error: null };
        },
      }),
    };
  },
}));

import { trackEvent } from "@/lib/analytics/track";

const ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

beforeEach(() => {
  inserts.length = 0;
  serviceClientCalls.count = 0;
  serviceClientCalls.fail = false;
  for (const k of ENV_KEYS) vi.stubEnv(k, "");
});
afterEach(() => vi.unstubAllEnvs());

describe("trackEvent", () => {
  it("is a no-op without Supabase", async () => {
    expect(await trackEvent("story_submitted")).toBe(false);
    expect(serviceClientCalls.count).toBe(0);
    expect(inserts).toEqual([]);
  });

  it("is a no-op when only the public Supabase variables are set (no service role)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(await trackEvent("report_generated")).toBe(false);
    expect(serviceClientCalls.count).toBe(0);
  });

  it("writes only the event name and locale through the service role", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    expect(await trackEvent("questionnaire_completed", "kk")).toBe(true);
    expect(inserts).toEqual([{ table: "analytics_events", row: { name: "questionnaire_completed", locale: "kk" } }]);
  });

  it("ignores unknown event names", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    expect(await trackEvent("page_viewed" as never)).toBe(false);
    expect(inserts).toEqual([]);
  });

  it("never throws when the database fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    serviceClientCalls.fail = true;
    await expect(trackEvent("story_submitted")).resolves.toBe(false);
  });
});
