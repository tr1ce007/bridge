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

/**
 * Where redirects after sign-in go. Behind a reverse proxy `request.url` can show an internal address
 * (e.g. http://localhost:3000), so when NEXT_PUBLIC_SITE_URL is set its origin is used instead.
 * An unset or non-http(s) value falls back to the request's own origin.
 */
export function callbackOrigin(requestUrl: string, siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const fallback = new URL(requestUrl).origin;
  const raw = siteUrl?.trim();
  if (!raw) return fallback;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : fallback;
  } catch {
    return fallback;
  }
}
