import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { isSupabaseConfigured, supabasePublicEnv } from "./config";

export interface PendingCookie {
  name: string;
  value: string;
  options: CookieOptions;
}

export interface SessionRefresh {
  cookies: PendingCookie[];
  /** Cache headers Supabase asks for when it sets cookies (keeps a CDN from caching a session). */
  headers: Record<string, string>;
}

/** Supabase auth cookies are named `sb-<project>-auth-token` (possibly split into `.0`, `.1`). */
export function hasAuthCookie(request: Pick<NextRequest, "cookies">): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

/**
 * Refreshes an expiring Supabase session before the page renders (the pattern from @supabase/ssr).
 * - Does nothing for guests: no Supabase configured, or no auth cookie on the request.
 * - Writes the new tokens into the *request* cookies too, so the next-intl middleware and the
 *   server components of this same request already see the refreshed session.
 * - Returns the cookies to copy onto the response. Never throws: a Supabase outage must not break routing.
 */
export async function refreshSession(request: NextRequest): Promise<SessionRefresh> {
  const result: SessionRefresh = { cookies: [], headers: {} };
  if (!isSupabaseConfigured() || !hasAuthCookie(request)) return result;
  try {
    const { url, anonKey } = supabasePublicEnv();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value, options } of cookiesToSet) {
            if (value) request.cookies.set(name, value);
            else request.cookies.delete(name);
            result.cookies.push({ name, value, options });
          }
          Object.assign(result.headers, headers);
        },
      },
    });
    // Validates the token (and refreshes it when it is about to expire).
    await supabase.auth.getClaims();
  } catch {
    // keep going without a refreshed session
  }
  return result;
}
