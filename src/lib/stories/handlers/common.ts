import "server-only";
import { headerLocale } from "@/lib/ai/handlers/common";
import { LOCALES, type Locale } from "@/lib/data/types";
import { storiesApiCopy, type StoriesApiKey } from "../server-copy";

/** Locale for error messages: the body's `locale` when valid, else Accept-Language, else "ru". */
export function messageLocale(request: Request, body: unknown): Locale {
  const l = (body as { locale?: unknown } | null)?.locale;
  return LOCALES.includes(l as Locale) ? (l as Locale) : headerLocale(request);
}

export type StoriesErrorCode =
  | "consent_required"
  | "invalid"
  | "local_mode"
  | "sign_in_required"
  | "save_failed"
  | "not_found";

/** JSON error: `error` is shown to the person (localized), `code` is for the client. */
export function apiError(status: number, code: StoriesErrorCode, locale: Locale, key: StoriesApiKey, extra: object = {}): Response {
  return Response.json({ error: storiesApiCopy(locale, key), code, ...extra }, { status });
}
