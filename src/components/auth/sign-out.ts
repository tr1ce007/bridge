import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Ends the session in this browser. Data kept on this device stays; the account's data stays in the account. */
export async function signOut(): Promise<void> {
  await createSupabaseBrowserClient().auth.signOut();
}
