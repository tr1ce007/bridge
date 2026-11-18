import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Locale } from "@/lib/data/types";
import type { AIErrorKind, ProviderName } from "./types";
import { redactSecrets } from "./redact";

export interface AIFailure {
  route: "report" | "followup" | "chat" | "whatif";
  provider: ProviderName;
  kind: AIErrorKind;
  message: string;
  locale: Locale;
}

/**
 * Records an AI failure in `ai_failures` (Supabase service role, no user id, no user content) or,
 * without Supabase, as one structured console.error line. Never throws.
 */
export async function logAIFailure(f: AIFailure): Promise<void> {
  // A misconfigured env (a key pasted into a URL field) once put the key into this message.
  const message = redactSecrets(f.message).slice(0, 500);
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createSupabaseServiceClient } = await import("@/lib/supabase/server");
      const { error } = await createSupabaseServiceClient()
        .from("ai_failures")
        .insert({ provider: f.provider, kind: `${f.route}:${f.kind}`, message, locale: f.locale });
      if (!error) return;
    } catch {
      // fall through to the console line
    }
  }
  console.error(JSON.stringify({ event: "ai_failure", at: new Date().toISOString(), ...f, message }));
}
