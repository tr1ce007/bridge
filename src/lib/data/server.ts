import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getContent } from "./index";
import { createSupabaseContentStore } from "./supabase-store";
import type { ContentStore } from "./types";

/**
 * Content store for route handlers. In Supabase mode it acts as the signed-in user (it reads the
 * auth cookies), so row-level security applies to the person who is calling; otherwise it is the
 * same local store as `getContent()`. Use `getContent()` for public reads in server components
 * (it does not touch cookies, so pages stay static).
 */
export async function getServerContent(): Promise<ContentStore> {
  if (!isSupabaseConfigured()) return getContent();
  const client = await createSupabaseServerClient();
  return createSupabaseContentStore(() => client);
}
