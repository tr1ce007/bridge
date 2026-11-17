import { describe, expect, it } from "vitest";
import { httpUrl, isHttpUrl } from "@/lib/data/http-url";
import { opportunitySchema, storySchema } from "@/lib/data/types";
import { bundledOpportunities, bundledStories } from "@/lib/data/local-content";

describe("httpUrl", () => {
  it("accepts http and https", () => {
    expect(httpUrl.safeParse("https://example.com/path?q=1").success).toBe(true);
    expect(httpUrl.safeParse("http://example.com").success).toBe(true);
    expect(httpUrl.safeParse("  https://example.com  ").data).toBe("https://example.com");
  });

  it("rejects javascript: and data: and other schemes", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:x",
      "file:///etc/passwd",
      "ftp://example.com",
      "//example.com",
      "example.com",
      "https://",
      "",
    ]) {
      expect(httpUrl.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("isHttpUrl mirrors the schema", () => {
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
  });

  it("rejects very long urls", () => {
    expect(httpUrl.safeParse(`https://example.com/${"a".repeat(2100)}`).success).toBe(false);
  });
});

describe("data schemas use httpUrl", () => {
  it("opportunitySchema.url rejects javascript:", () => {
    const base = bundledOpportunities[0];
    expect(opportunitySchema.safeParse(base).success).toBe(true);
    expect(opportunitySchema.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(false);
    expect(opportunitySchema.safeParse({ ...base, url: "data:text/html,x" }).success).toBe(false);
  });

  it("storySchema.sourceUrl rejects javascript:", () => {
    const base = bundledStories[0];
    expect(storySchema.safeParse({ ...base, sourceUrl: "https://example.com/a" }).success).toBe(true);
    expect(storySchema.safeParse({ ...base, sourceUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});
