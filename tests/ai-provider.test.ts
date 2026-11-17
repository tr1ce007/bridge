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
