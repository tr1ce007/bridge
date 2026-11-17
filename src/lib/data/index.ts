import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createLocalContentStore } from "./local-content";
import { createLocalUserStore } from "./local-store";
import { createSupabaseContentStore, createSupabaseUserStore } from "./supabase-store";
import type { ContentStore, UserStore } from "./types";

export { isSupabaseConfigured };
export { storageMode, type StorageMode } from "./storage";
export { SignInRequiredError } from "./supabase-store";
export * from "./types";

let localUser: UserStore | undefined;
let supabaseUser: UserStore | undefined;
let localContent: ContentStore | undefined;
let supabaseContent: ContentStore | undefined;

/**
 * Personal data (questionnaire, reports, roadmap, journal, saved items).
 * Call from client components. Supabase when configured, otherwise this browser.
 */
export function getUserStore(): UserStore {
  localUser ??= createLocalUserStore();
  if (!isSupabaseConfigured()) return localUser;
  supabaseUser ??= createSupabaseUserStore(createSupabaseBrowserClient, localUser);
  return supabaseUser;
}

/** Stories, experiments, opportunities. Works on the server and in the browser. */
export function getContent(): ContentStore {
  if (!isSupabaseConfigured()) return (localContent ??= createLocalContentStore());
  return (supabaseContent ??= createSupabaseContentStore(createSupabaseBrowserClient));
}
