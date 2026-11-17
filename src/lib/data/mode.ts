import { isSupabaseConfigured } from "@/lib/supabase/config";
import { storageMode } from "./storage";

/** Where this person's data lives: this browser, memory only (storage blocked) or a signed-in account. */
export type DataLocation = "local" | "memory" | "account";

/**
 * "account" only when Supabase is configured AND someone is signed in; a visitor without a
 * session still uses this browser even when Supabase is configured.
 */
export async function dataLocation(): Promise<DataLocation> {
  if (isSupabaseConfigured()) {
    try {
      const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
      const { data } = await createSupabaseBrowserClient().auth.getSession();
      if (data.session?.user) return "account";
    } catch {
      // fall through to the browser
    }
  }
  return storageMode();
}
