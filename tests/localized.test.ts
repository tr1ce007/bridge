import { describe, expect, it } from "vitest";
import { localized, localizedList } from "@/lib/localized";

describe("localized helpers", () => {
  it("picks the locale, falls back to ru", () => {
    expect(localized({ ru: "а", kk: "ә", en: "a" }, "kk")).toBe("ә");
    expect(localized({ ru: "а", en: "a" }, "kk")).toBe("а");
    expect(localized({ en: "a" }, "kk")).toBe("a");
    expect(localized(undefined, "ru")).toBe("");
  });
  it("falls back for lists too", () => {
    expect(localizedList({ ru: ["а"], en: ["a"] }, "kk")).toEqual(["а"]);
    expect(localizedList({ ru: [], en: ["a"] }, "ru")).toEqual(["a"]);
    expect(localizedList(null, "ru")).toEqual([]);
  });
});
