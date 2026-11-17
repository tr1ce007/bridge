import { z } from "zod";

/** Longest address we accept (browsers and most servers stop around 2000 characters anyway). */
export const MAX_URL_LENGTH = 2048;

/**
 * True only for an absolute http: or https: address with a host.
 * `z.string().url()` also accepts `javascript:` and `data:`, which must never become a link.
 */
export function isHttpUrl(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > MAX_URL_LENGTH) return false;
  try {
    const u = new URL(v);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.length > 0;
  } catch {
    return false;
  }
}

/** Zod schema for every address a person or admin can enter: trimmed, http(s) only. */
export const httpUrl = z
  .string()
  .trim()
  .refine(isHttpUrl, { message: "Only http and https addresses are allowed" });
