import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";
import ru from "../messages/ru.json";

describe("navigation", () => {
  it("marks a section active on its page and its sub-pages only", () => {
    expect(isActivePath("/stories", "/stories")).toBe(true);
    expect(isActivePath("/stories/abc", "/stories")).toBe(true);
    expect(isActivePath("/stories-old", "/stories")).toBe(false);
    expect(isActivePath("/", "/stories")).toBe(false);
  });

  it("has a nav.* label for every item", () => {
    for (const item of NAV_ITEMS) {
      expect(ru.nav[item.key]).toBeTruthy();
    }
  });
});
