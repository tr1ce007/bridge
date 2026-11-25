import { beforeEach, describe, expect, it, vi } from "vitest";
import { contrast, ensureContrast, mix, WHITE } from "@/lib/site-settings/color";
import { DEFAULT_TEAM_CONTACT, teamContact } from "@/lib/site-settings/contact";
import { withLandingOverrides } from "@/lib/site-settings/landing";
import { decodeLogo, logoUrl } from "@/lib/site-settings/logo";
import { EMPTY_SETTINGS, LANDING_KEYS, parseStoredSettings, siteSettingsSchema } from "@/lib/site-settings/schema";
import { themeCss, themeVars } from "@/lib/site-settings/theme";

const state = vi.hoisted(() => ({
  role: "admin" as "user" | "moderator" | "admin" | null,
  upserts: [] as unknown[],
  upsertError: null as null | { message: string },
  updated: [] as string[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: (tag: string) => state.updated.push(tag),
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("@/lib/auth/roles", async () => {
  class AuthError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  }
  return {
    AuthError,
    requireRole: async (roles: string[]) => {
      if (state.role === null) throw new AuthError("unauthenticated");
      if (state.role === "user" || !roles.includes(state.role)) throw new AuthError("forbidden");
      return { id: "admin-1", email: "a@example.com", role: state.role };
    },
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: () => ({
      upsert: async (row: unknown) => {
        state.upserts.push(row);
        return { error: state.upsertError };
      },
    }),
  }),
}));

const PNG = "data:image/png;base64,iVBORw0KGgo=";

describe("site settings schema", () => {
  it("accepts a full valid object and normalises it", () => {
    const s = siteSettingsSchema.parse({
      colors: { primary: "#0F4BD1", navy: "#102a56", accent: "#ffcc00" },
      contact: { phone: "+7 (700) 000 00 00", instagram: "@my.page", email: "team@example.com" },
      landing: { ru: { "hero.title": "Новый заголовок" }, en: { "final.cta": "Go" } },
      logo: PNG,
    });
    expect(s.colors.primary).toBe("#0f4bd1");
    expect(s.contact.instagram).toBe("my.page");
    expect(s.landing.ru?.["hero.title"]).toBe("Новый заголовок");
  });

  it("rejects colours that white text cannot be read on, but not a light accent", () => {
    const r = siteSettingsSchema.safeParse({ colors: { primary: "#ffee88", navy: "#dddddd", accent: "#ffee88" } });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["colors.primary", "colors.navy"]));
    expect(paths).not.toContain("colors.accent");
  });

  it("rejects bad colours, unknown text keys, markup in texts and other image types", () => {
    expect(siteSettingsSchema.safeParse({ colors: { primary: "red" } }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ colors: { primary: "#155eef;}body{x:y" } }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ landing: { ru: { "nav.home": "x" } } }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ landing: { ru: { "hero.title": "Hi {name}" } } }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ landing: { ru: { "hero.title": "<b>x</b>" } } }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ logo: "data:image/svg+xml;base64,PHN2Zz4=" }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ contact: { phone: "call me" } }).success).toBe(false);
  });

  it("covers every home-page text and falls back to the built-in look on unreadable data", () => {
    expect(LANDING_KEYS).toContain("hero.title");
    expect(LANDING_KEYS).toContain("final.cta");
    expect(parseStoredSettings(null)).toEqual(EMPTY_SETTINGS);
    expect(parseStoredSettings({ colors: { primary: "not-a-colour" } })).toEqual(EMPTY_SETTINGS);
  });
});

describe("theme", () => {
  it("adds no stylesheet when no colour is set", () => {
    expect(themeCss({})).toBe("");
  });

  it("derives both themes from the chosen colours and keeps white text readable", () => {
    const { light, dark } = themeVars({ primary: "#0f4bd1", accent: "#f59e0b", navy: "#1f2937" });
    expect(light["--primary"]).toBe("#0f4bd1");
    expect(light["--brand-navy"]).toBe("#1f2937");
    expect(contrast(dark["--primary"], WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light["--accent-text"], WHITE)).toBeGreaterThanOrEqual(4.5);
    const css = themeCss({ primary: "#0f4bd1" });
    expect(css).toContain(":root{--primary:#0f4bd1");
    expect(css).toContain('[data-theme="dark"]{');
    expect(css).toContain("@media (prefers-color-scheme: dark)");
  });

  it("colour helpers behave", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrast(ensureContrast("#ffdd00", WHITE, 4.5, "#000000"), WHITE)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("contacts, texts and logo", () => {
  it("keeps the built-in contacts and replaces only what was changed", () => {
    expect(teamContact({})).toEqual(DEFAULT_TEAM_CONTACT);
    const c = teamContact({ phone: "+7 (701) 111 22 33", instagram: "new.page", email: "hi@example.com" });
    expect(c.phoneHref).toBe("tel:+77011112233");
    expect(c.instagram).toBe("@new.page");
    expect(c.instagramHref).toBe("https://www.instagram.com/new.page/");
    expect(c.instagramDmHref).toBe("https://ig.me/m/new.page");
    expect(c.email).toEqual({ email: "hi@example.com", href: "mailto:hi@example.com" });
  });

  it("puts home-page texts over the bundled ones for that language only, without mutating", () => {
    const messages = { landing: { hero: { title: "Old", lead: "Lead" } }, nav: { home: "Home" } };
    const out = withLandingOverrides(messages, { ru: { "hero.title": "New" } }, "ru");
    expect(out.landing.hero).toEqual({ title: "New", lead: "Lead" });
    expect(out.nav).toBe(messages.nav);
    expect(messages.landing.hero.title).toBe("Old");
    expect(withLandingOverrides(messages, { ru: { "hero.title": "New" } }, "en")).toBe(messages);
  });

  it("serves the logo from a fingerprinted address", () => {
    expect(logoUrl(undefined)).toBeUndefined();
    expect(logoUrl(PNG)).toMatch(/^\/api\/site-logo\?v=[0-9a-z]+$/);
    expect(logoUrl(PNG)).not.toBe(logoUrl(`${PNG}AA`));
    const d = decodeLogo(PNG);
    expect(d?.type).toBe("image/png");
    expect(Array.from(d!.bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});

describe("saveAppearanceAction", () => {
  beforeEach(() => {
    state.role = "admin";
    state.upserts = [];
    state.upsertError = null;
    state.updated = [];
  });
  const form = (settings: unknown) => {
    const fd = new FormData();
    fd.set("settings", typeof settings === "string" ? settings : JSON.stringify(settings));
    return fd;
  };

  it("lets only admins save", async () => {
    const { saveAppearanceAction } = await import("@/lib/site-settings/actions");
    for (const role of ["moderator", "user"] as const) {
      state.role = role;
      expect(await saveAppearanceAction({ status: "idle" }, form({}))).toEqual({ status: "error", code: "forbidden" });
    }
    state.role = null;
    expect(await saveAppearanceAction({ status: "idle" }, form({}))).toEqual({ status: "error", code: "unauthenticated" });
    expect(state.upserts).toHaveLength(0);
  });

  it("validates, saves the single row and refreshes the public cache", async () => {
    const { saveAppearanceAction } = await import("@/lib/site-settings/actions");
    const ok = await saveAppearanceAction({ status: "idle" }, form({ colors: { primary: "#0F4BD1" } }));
    expect(ok).toEqual({ status: "ok", message: "savedNote" });
    expect(state.upserts[0]).toMatchObject({ id: "site", updated_by: "admin-1", data: { colors: { primary: "#0f4bd1" } } });
    expect(state.updated).toEqual(["site-settings"]);

    const bad = await saveAppearanceAction({ status: "idle" }, form({ colors: { primary: "#ffffff" } }));
    expect(bad).toEqual({ status: "error", code: "invalid", fields: ["colors.primary"] });
    expect(await saveAppearanceAction({ status: "idle" }, form("not json"))).toEqual({ status: "error", code: "invalid" });
    expect(state.upserts).toHaveLength(1);
  });

  it("reports a database failure", async () => {
    const { saveAppearanceAction } = await import("@/lib/site-settings/actions");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    state.upsertError = { message: "denied" };
    expect(await saveAppearanceAction({ status: "idle" }, form({}))).toEqual({ status: "error", code: "failed" });
    spy.mockRestore();
  });
});
