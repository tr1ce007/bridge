import { describe, expect, it } from "vitest";
import { redactSecrets } from "@/lib/ai/redact";

describe("redactSecrets", () => {
  it("removes a key that was put into the base URL field", () => {
    const key = "AQ.FakeKeyForTests1234567890abcdefXYZ";
    const msg = `Failed to parse URL from ${key}/chat/completions`;
    const out = redactSecrets(msg, { OPENAI_BASE_URL: key });
    expect(out).not.toContain(key);
    expect(out).toContain("Failed to parse URL from");
  });

  it("removes configured secret values wherever they appear", () => {
    const out = redactSecrets("bad key short-but-secret-1", { OPENAI_API_KEY: "short-but-secret-1" });
    expect(out).toBe("bad key [redacted]");
  });

  it("removes URLs and long token-like strings even without env", () => {
    const out = redactSecrets("GET https://api.example.com/v1?key=abc failed; token sk-test-0123456789abcdefghijklmn", {});
    expect(out).not.toContain("example.com");
    expect(out).not.toContain("sk-test-0123456789");
  });

  it("keeps ordinary error text readable", () => {
    expect(redactSecrets("HTTP 503", {})).toBe("HTTP 503");
    expect(redactSecrets("The operation was aborted due to timeout", {})).toBe("The operation was aborted due to timeout");
  });
});
