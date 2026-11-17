import { describe, expect, it } from "vitest";
import ru from "../messages/ru.json";
import kk from "../messages/kk.json";
import en from "../messages/en.json";
import { routing } from "@/i18n/routing";

type Dict = { [key: string]: string | Dict };

function flattenKeys(obj: Dict, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : flattenKeys(value, path);
  });
}

function emptyValues(obj: Dict, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") return value.trim() === "" ? [path] : [];
    return emptyValues(value, path);
  });
}

describe("i18n", () => {
  it("dictionaries have identical keys", () => {
    const ruKeys = flattenKeys(ru as Dict).sort();
    expect(ruKeys.length).toBeGreaterThan(0);
    expect(flattenKeys(kk as Dict).sort()).toEqual(ruKeys);
    expect(flattenKeys(en as Dict).sort()).toEqual(ruKeys);
  });

  it("dictionaries have no empty strings", () => {
    for (const dict of [ru, kk, en]) {
      expect(emptyValues(dict as Dict)).toEqual([]);
    }
  });

  it("routing uses ru/kk/en with ru default and always-prefixed URLs", () => {
    expect(routing.locales).toEqual(["ru", "kk", "en"]);
    expect(routing.defaultLocale).toBe("ru");
    expect(routing.localePrefix).toBe("always");
  });
});
