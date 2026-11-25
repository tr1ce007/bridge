import { z } from "zod";
import ru from "../../../messages/ru.json";
import { contrast, MIN_TEXT_CONTRAST, WHITE } from "./color";

/**
 * What the admin "Appearance" editor can change. Everything is optional: a missing value keeps the
 * built-in look, so an empty (or unreadable) settings row renders the site exactly as before.
 */

export const SETTINGS_LOCALES = ["ru", "kk", "en"] as const;
export type SettingsLocale = (typeof SETTINGS_LOCALES)[number];

function flattenStrings(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flattenStrings(v as Record<string, unknown>, `${prefix}${k}.`) : typeof v === "string" ? [`${prefix}${k}`] : [],
  );
}

/** Every text of the home page (`landing.*` in messages), e.g. "hero.title". */
export const LANDING_KEYS: readonly string[] = flattenStrings(ru.landing as Record<string, unknown>);
const LANDING_KEY_SET = new Set(LANDING_KEYS);

export const LANDING_TEXT_MAX = 500;
/** Logo is stored inline as a small data URL (the editor resizes it to 256 px before upload). */
export const LOGO_MAX_CHARS = 300_000;

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((s) => s.toLowerCase());

const landingText = z
  .string()
  .trim()
  .min(1)
  .max(LANDING_TEXT_MAX)
  // Plain text only: braces and angle brackets would be read as message placeholders or markup.
  .refine((s) => !/[{}<>]/.test(s), { message: "plain-text" });

const landingLocale = z
  .record(z.string(), landingText)
  .refine((r) => Object.keys(r).every((k) => LANDING_KEY_SET.has(k)), { message: "unknown-key" });

export const siteSettingsSchema = z
  .object({
    colors: z
      .object({
        primary: hex.optional(),
        accent: hex.optional(),
        navy: hex.optional(),
      })
      .default({}),
    contact: z
      .object({
        phone: z
          .string()
          .trim()
          .regex(/^\+?[0-9][0-9 ()-]{5,22}$/)
          .optional(),
        instagram: z
          .string()
          .trim()
          .regex(/^@?[A-Za-z0-9._]{1,30}$/)
          .transform((s) => s.replace(/^@/, ""))
          .optional(),
        email: z.string().trim().email().max(120).optional(),
      })
      .default({}),
    landing: z
      .object({ ru: landingLocale.optional(), kk: landingLocale.optional(), en: landingLocale.optional() })
      .default({}),
    logo: z
      .string()
      .max(LOGO_MAX_CHARS)
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/)
      .optional(),
  })
  .superRefine((s, ctx) => {
    // Buttons and the dark bands carry white text: keep it readable.
    for (const key of ["primary", "navy"] as const) {
      const c = s.colors[key];
      if (c && contrast(c, WHITE) < MIN_TEXT_CONTRAST) {
        ctx.addIssue({ code: "custom", path: ["colors", key], message: "low-contrast" });
      }
    }
  });

export type SiteSettings = z.output<typeof siteSettingsSchema>;

export const EMPTY_SETTINGS: SiteSettings = { colors: {}, contact: {}, landing: {} };

/** Settings as stored in the database; anything unreadable falls back to the built-in look. */
export function parseStoredSettings(raw: unknown): SiteSettings {
  const parsed = siteSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : EMPTY_SETTINGS;
}
