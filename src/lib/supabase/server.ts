import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublicEnv } from "./config";

/** Server-side client acting as the signed-in user (reads the auth cookies). */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, anonKey } = supabasePublicEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // Refreshing the session in a proxy / route handler covers it.
        }
      },
    },
  });
}

/**
 * Service-role client: bypasses RLS. Server only, for writes that users must not
 * make themselves (ai_failures, analytics_events). Never import from client code.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  const { url } = supabasePublicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
