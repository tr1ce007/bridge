import { describe, expect, it } from "vitest";
import { computeTranslationCoverage, flattenMessages } from "@/lib/admin/translation-coverage";
import ru from "../messages/ru.json";
import kk from "../messages/kk.json";
import en from "../messages/en.json";

describe("flattenMessages", () => {
  it("flattens nested objects to dotted keys and ignores non-strings", () => {
    expect(flattenMessages({ a: { b: "x", c: { d: "y" } }, e: "z", n: 3 })).toEqual({ "a.b": "x", "a.c.d": "y", e: "z" });
  });
});

describe("computeTranslationCoverage", () => {
  it("finds missing, empty and identical-to-ru values per locale", () => {
    const result = computeTranslationCoverage({
      ru: { a: "Привет", b: { c: "Мир", d: "Дом" }, num: "2026", brand: "THE BRIDGE" },
      kk: { a: "Сәлем", b: { c: "Мир", d: "" }, num: "2026", brand: "THE BRIDGE" },
      en: { a: "Hello", b: { c: "World" }, num: "2026", brand: "THE BRIDGE" },
    });
    expect(result.total).toBe(5);
    // identical to ru: b.c (a real untranslated string); "2026" has no letters; THE BRIDGE is a brand name in Latin letters but still identical.
    expect(result.kk.missing).toEqual(["b.d"]);
    expect(result.kk.identical).toContain("b.c");
    expect(result.kk.identical).not.toContain("num");
    expect(result.en.missing).toEqual(["b.d"]);
    expect(result.en.identical).not.toContain("b.c");
    expect(result.en.extra).toEqual([]);
  });

  it("reports extra keys that ru does not have", () => {
    const result = computeTranslationCoverage({ ru: { a: "А" }, kk: { a: "Ә", z: "Ж" }, en: { a: "A" } });
    expect(result.kk.extra).toEqual(["z"]);
  });

  it("the shipped dictionaries have no missing keys (parity)", () => {
    const result = computeTranslationCoverage({ ru, kk, en });
    expect(result.kk.missing).toEqual([]);
    expect(result.en.missing).toEqual([]);
    expect(result.kk.extra).toEqual([]);
    expect(result.en.extra).toEqual([]);
    expect(result.total).toBeGreaterThan(500);
  });
});
