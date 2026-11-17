import { NextResponse, type NextRequest } from "next/server";
import { callbackLocale, type AuthErrorParam } from "@/lib/auth/callback";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Magic-link and Google sign-in land here with `?code=...&locale=ru`.
 * The code is exchanged for a session (the cookies are set on this response by the server client),
 * then the visitor goes to their locale dashboard. Every failure goes to /[locale]/auth?error=<code>,
 * which shows a localized message. The redirect target is built from our own origin and a validated
 * locale only, so this route cannot be used as an open redirect.
 *
 * This path has no locale prefix, so src/proxy.ts excludes it from locale routing.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const locale = callbackLocale(searchParams.get("locale"));
  const toAuth = (error: AuthErrorParam) => NextResponse.redirect(new URL(`/${locale}/auth?error=${error}`, origin));

  if (!isSupabaseConfigured()) return toAuth("unconfigured");

  // The provider reports its own problems (access denied, expired link) as ?error=...
  const code = searchParams.get("code");
  if (searchParams.get("error") || !code) return toAuth("link_invalid");

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Typical cause: the link was opened in another browser than the one that asked for it.
    if (error) return toAuth("link_invalid");
  } catch {
    return toAuth("failed");
  }
  return NextResponse.redirect(new URL(`/${locale}/dashboard`, origin));
}
