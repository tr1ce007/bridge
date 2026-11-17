import { describe, expect, it } from "vitest";
import { themeInitScript, THEME_STORAGE_KEY } from "@/lib/theme";

describe("themeInitScript", () => {
  function run(stored: string | null, prefersDark: boolean, storageThrows = false) {
    const root = { dataset: {} as Record<string, string> };
    const localStorage = {
      getItem: (key: string) => {
        if (storageThrows) throw new Error("blocked");
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    };
    const matchMedia = () => ({ matches: prefersDark });
    new Function("document", "localStorage", "matchMedia", themeInitScript)(
      { documentElement: root },
      localStorage,
      matchMedia,
    );
    return root.dataset.theme;
  }

  it("prefers a valid stored choice over the system preference", () => {
    expect(run("dark", false)).toBe("dark");
    expect(run("light", true)).toBe("light");
  });

  it("follows prefers-color-scheme when nothing valid is stored", () => {
    expect(run(null, true)).toBe("dark");
    expect(run(null, false)).toBe("light");
    expect(run("purple", true)).toBe("dark");
  });

  it("still sets a theme when localStorage throws", () => {
    expect(run(null, true, true)).toBe("dark");
  });
});
