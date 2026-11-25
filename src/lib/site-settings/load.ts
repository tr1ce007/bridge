import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { isSupabaseConfigured, supabasePublicEnv } from "@/lib/supabase/config";
import { EMPTY_SETTINGS, parseStoredSettings, type SiteSettings } from "./schema";

/** Cache tag of the settings row; the editor's save action expires it. */
export const SITE_SETTINGS_TAG = "site-settings";

// Public read (no cookies), so pages that use it can still be cached and prerendered.
const readRow = unstable_cache(
  async (): Promise<unknown> => {
    const { url, anonKey } = supabasePublicEnv();
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.from("site_settings").select("data").eq("id", "site").maybeSingle();
    if (error) throw new Error(error.message);
    return data?.data ?? null;
  },
  ["site-settings-v1"],
  { tags: [SITE_SETTINGS_TAG], revalidate: 600 },
);

/** The editor's settings, or the built-in look when there is no database or the read fails. */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isSupabaseConfigured()) return EMPTY_SETTINGS;
  try {
    return parseStoredSettings(await readRow());
  } catch (e) {
    console.error("[site-settings] read failed:", e instanceof Error ? e.message : e);
    return EMPTY_SETTINGS;
  }
}
