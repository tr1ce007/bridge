import { describe, expect, it } from "vitest";
import { buildSubmittedStory } from "@/lib/data/content-utils";
import { sanitizeText } from "@/lib/data/sanitize";
import { createLocalContentStore } from "@/lib/data/local-content";
import { resetStorageState } from "@/lib/data/storage";

describe("sanitizeText", () => {
  it("strips tags, scripts and control characters", () => {
    expect(sanitizeText('Привет <b>мир</b><script>alert(1)</script>!\u0000')).toBe("Привет мир !");
    expect(sanitizeText("a <!-- hidden --> b")).toBe("a b");
    expect(sanitizeText("  много   пробелов\n\n\n\nи строк ")).toBe("много пробелов\n\nи строк");
  });

  it("keeps plain text, comparisons and Kazakh letters", () => {
    expect(sanitizeText("2 < 3 және 5 > 4, Ә Ғ Қ Ң Ө Ұ Ү Һ І")).toBe("2 < 3 және 5 > 4, Ә Ғ Қ Ң Ө Ұ Ү Һ І");
  });
});

describe("story submission", () => {
  const input = {
    lang: "en" as const,
    title: "My <i>story</i>",
    before: "Before <script>x()</script>",
    challenges: "c",
    turningPoint: "t",
    actions: "a",
    now: "n",
    tags: { start: ["small-town", "made-up-tag"], interests: ["tech"] },
  };

  it("builds a pending user story with sanitized text and known tags only", () => {
    const s = buildSubmittedStory(input, "id1");
    expect(s.kind).toBe("user");
    expect(s.status).toBe("pending");
    expect(s.title).toEqual({ en: "My story" });
    expect(s.before).toEqual({ en: "Before" });
    expect(s.tags.start).toEqual(["small-town"]);
    expect(s.tags.fears).toEqual([]);
  });

  it("rejects invalid input", () => {
    expect(() => buildSubmittedStory({ ...input, title: "x" }, "id")).toThrow();
  });

  it("rejects a required field that is empty after sanitizing", () => {
    expect(() => buildSubmittedStory({ ...input, title: "<b></b>" }, "id")).toThrow();
    expect(() => buildSubmittedStory({ ...input, before: "<script>x()</script>" }, "id")).toThrow();
    expect(() => buildSubmittedStory({ ...input, now: "<!-- nothing -->" }, "id")).toThrow();
  });

  it("local submit stores it as pending and does not publish it", async () => {
    resetStorageState();
    const c = createLocalContentStore();
    const res = await c.submitStory(input);
    expect(res.status).toBe("pending");
    expect(await c.getStory(res.id)).toBeNull();
    resetStorageState();
  });
});
