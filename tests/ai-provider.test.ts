import { describe, expect, it } from "vitest";
import { getProvider, resolveProviderName } from "@/lib/ai/provider";
import { rateLimit } from "@/lib/ai/rate-limit";

describe("provider selection", () => {
  it("picks anthropic, then openai, then demo by available keys", () => {
    expect(resolveProviderName({})).toBe("demo");
    expect(resolveProviderName({ OPENAI_API_KEY: "o" })).toBe("openai");
    expect(resolveProviderName({ OPENAI_API_KEY: "o", ANTHROPIC_API_KEY: "a" })).toBe("anthropic");
    expect(resolveProviderName({ AI_PROVIDER: "openai", OPENAI_API_KEY: "o", ANTHROPIC_API_KEY: "a" })).toBe("openai");
  });

  it("falls back to demo when the named provider has no key, or demo is forced", () => {
    expect(resolveProviderName({ AI_PROVIDER: "anthropic" })).toBe("demo");
    expect(resolveProviderName({ AI_PROVIDER: "demo", ANTHROPIC_API_KEY: "a" })).toBe("demo");
    expect(getProvider({}).name).toBe("demo");
  });
});

describe("rateLimit", () => {
  it("allows `limit` calls per window and resets after it", () => {
    const key = `k-${Math.random()}`;
    expect(rateLimit(key, 2, 1000, 0)).toBe(true);
    expect(rateLimit(key, 2, 1000, 10)).toBe(true);
    expect(rateLimit(key, 2, 1000, 20)).toBe(false);
    expect(rateLimit(key, 2, 1000, 1001)).toBe(true);
  });
});

describe("rate limit keys", () => {
  const req = (headers: Record<string, string>) => new Request("http://localhost/x", { headers });

  it("ignores client-supplied X-Forwarded-For hops (uses x-real-ip, else the last hop)", async () => {
    const { clientIp } = await import("@/lib/ai/rate-limit");
    expect(clientIp(req({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(req({ "x-forwarded-for": "2.2.2.2, 9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(req({ "x-real-ip": "8.8.8.8", "x-forwarded-for": "1.1.1.1" }))).toBe("8.8.8.8");
    expect(clientIp(req({}))).toBe("unknown");
  });

  it("a spoofed first hop does not give a fresh bucket", async () => {
    const { aiRateLimit } = await import("@/lib/ai/rate-limit");
    const limit = Number(process.env.RATE_LIMIT_PER_MINUTE || 10);
    const route = `spoof-${Math.random()}`;
    for (let i = 0; i < limit; i++) expect(aiRateLimit(req({ "x-forwarded-for": `6.6.6.${i}, 7.7.7.7` }), route)).toBe(true);
    expect(aiRateLimit(req({ "x-forwarded-for": "5.5.5.5, 7.7.7.7" }), route)).toBe(false);
  });

  it("never tracks more than RATE_LIMIT_MAX_KEYS keys (oldest evicted)", async () => {
    const { RATE_LIMIT_MAX_KEYS, rateLimitSize } = await import("@/lib/ai/rate-limit");
    for (let i = 0; i < RATE_LIMIT_MAX_KEYS + 50; i++) rateLimit(`cap-${i}`, 1, 60_000, 0);
    expect(rateLimitSize()).toBe(RATE_LIMIT_MAX_KEYS);
    // the newest key is still limited, the oldest was evicted and starts over
    expect(rateLimit(`cap-${RATE_LIMIT_MAX_KEYS + 49}`, 1, 60_000, 1)).toBe(false);
    expect(rateLimit("cap-0", 1, 60_000, 1)).toBe(true);
  });
});
