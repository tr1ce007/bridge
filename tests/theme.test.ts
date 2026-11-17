import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureThemeApplied, themeInitScript, THEME_STORAGE_KEY } from "@/lib/theme";

describe("themeInitScript", () => {
  function run(stored: string | null, prefersDark: boolean, storageThrows = false) {
    const classes = new Set<string>();
    const root = { dataset: {} as Record<string, string>, classList: { add: (c: string) => classes.add(c) } };
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
    return { theme: root.dataset.theme, js: classes.has("js") };
  }

  it("prefers a valid stored choice over the system preference", () => {
    expect(run("dark", false).theme).toBe("dark");
    expect(run("light", true).theme).toBe("light");
  });

  it("follows prefers-color-scheme when nothing valid is stored", () => {
    expect(run(null, true).theme).toBe("dark");
    expect(run(null, false).theme).toBe("light");
    expect(run("purple", true).theme).toBe("dark");
  });

  it("marks <html> with the js class for CSS-gated animations", () => {
    expect(run(null, false).js).toBe(true);
  });

  it("still sets a theme when localStorage throws", () => {
    expect(run(null, true, true).theme).toBe("dark");
  });
});

describe("ensureThemeApplied", () => {
  function setup(opts: { theme?: string; stored: string | null; prefersDark: boolean }) {
    const classes = new Set<string>();
    const root = {
      dataset: (opts.theme ? { theme: opts.theme } : {}) as Record<string, string>,
      classList: { add: (c: string) => classes.add(c) },
    };
    vi.stubGlobal("document", { documentElement: root });
    vi.stubGlobal("localStorage", { getItem: () => opts.stored, setItem: () => {} });
    vi.stubGlobal("matchMedia", () => ({ matches: opts.prefersDark }));
    ensureThemeApplied();
    return { theme: root.dataset.theme, js: classes.has("js") };
  }

  afterEach(() => vi.unstubAllGlobals());

  it("applies the stored theme when the inline script did not run (e.g. 404 shell)", () => {
    expect(setup({ stored: "light", prefersDark: true })).toEqual({ theme: "light", js: true });
    expect(setup({ stored: null, prefersDark: true }).theme).toBe("dark");
  });

  it("leaves an already-applied theme alone", () => {
    expect(setup({ theme: "dark", stored: "light", prefersDark: false }).theme).toBe("dark");
  });
});
