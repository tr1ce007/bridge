import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { refreshSession } from "./lib/supabase/proxy-session";

const handleI18nRouting = createMiddleware(routing);

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`; behaviour is the same.
 * 1. Refresh the Supabase session (only when the visitor has auth cookies, so guests cost nothing).
 *    The refreshed cookies are also put on the request, because the locale middleware below builds
 *    the downstream request from `request.headers`.
 * 2. Locale routing (next-intl), unchanged.
 * 3. Copy the refreshed cookies onto whatever response routing produced (redirect, rewrite or next).
 */
export default async function proxy(request: NextRequest) {
  const session = await refreshSession(request);
  const response = handleI18nRouting(request);
  for (const { name, value, options } of session.cookies) response.cookies.set(name, value, options);
  for (const [key, value] of Object.entries(session.headers)) response.headers.set(key, value);
  return response;
}

export const config = {
  // Skip API routes, the OAuth/magic-link callback (it has no locale prefix and sets its own
  // cookies), Next internals and files with an extension (images, icons…).
  matcher: "/((?!api|auth/callback|_next|_vercel|.*\\..*).*)",
};
