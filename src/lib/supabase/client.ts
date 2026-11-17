import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "./config";

/**
 * Supabase client for the browser (client components). In the browser the
 * library keeps one shared instance; on the server it returns a cookie-less
 * anonymous client, which is enough for public reads.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  const { url, anonKey } = supabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
