import "server-only";
import { z } from "zod";
import { LOCALES, type Locale } from "@/lib/data/types";
import { aiRateLimit } from "../rate-limit";
import { aiCopy } from "../server-copy";

const text = z.string().max(2000);
/** Questionnaire answers as sent by the client (bounded sizes). */
export const answersInput = z
  .array(
    z.object({
      questionId: z.string().min(1).max(40),
      value: z.union([text, z.array(text).max(20)]),
      skipped: z.boolean().optional(),
    }),
  )
  .max(80);

export const localeInput = z.enum(LOCALES);

/** Body as JSON, or null when it is not JSON. */
export async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Locale from a body that may be invalid (used for error messages before full validation). */
export function looseLocale(body: unknown): Locale {
  const l = (body as { locale?: unknown } | null)?.locale;
  return LOCALES.includes(l as Locale) ? (l as Locale) : "ru";
}

/** 429 with a localized message, or null when the request may proceed. */
export function rateLimited(request: Request, route: string, locale: Locale): Response | null {
  if (aiRateLimit(request, route)) return null;
  return Response.json({ error: aiCopy(locale, "rateLimited") }, { status: 429, headers: { "retry-after": "60" } });
}

export function badRequest(locale: Locale): Response {
  return Response.json({ error: aiCopy(locale, "invalidRequest") }, { status: 400 });
}
