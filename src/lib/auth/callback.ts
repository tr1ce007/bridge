import { routing, type Locale } from "@/i18n/routing";

/** Error codes the callback hands to /[locale]/auth?error=<code>; the page shows a localized text for each. */
export const AUTH_ERRORS = ["link_invalid", "unconfigured", "failed"] as const;
export type AuthErrorParam = (typeof AUTH_ERRORS)[number];

export function isAuthErrorParam(value: unknown): value is AuthErrorParam {
  return typeof value === "string" && (AUTH_ERRORS as readonly string[]).includes(value);
}

/** The `locale` query parameter if it is one of ours, else the default locale. */
export function callbackLocale(value: string | null): Locale {
  return (routing.locales as readonly string[]).includes(value ?? "") ? (value as Locale) : routing.defaultLocale;
}
