import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAnalyticsEvent, type AnalyticsEvent } from "./events";

/**
 * Counts one key action in `analytics_events`.
 * - Anonymous: stores only the event name and the page language. No user id, no content.
 * - Needs Supabase and the service role key (the table has no insert policy for users);
 *   without them it does nothing and returns false.
 * - Never throws: analytics must not break the action it observes.
 */
export async function trackEvent(name: AnalyticsEvent, locale?: "ru" | "kk" | "en"): Promise<boolean> {
  if (!isAnalyticsEvent(name)) return false;
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const { createSupabaseServiceClient } = await import("@/lib/supabase/server");
    const { error } = await createSupabaseServiceClient()
      .from("analytics_events")
      .insert({ name, ...(locale ? { locale } : {}) });
    return !error;
  } catch {
    return false;
  }
}
