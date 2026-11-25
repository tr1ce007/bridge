"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { AuthError, requireRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_SETTINGS_TAG } from "./load";
import { siteSettingsSchema } from "./schema";

/**
 * Saves admin → Appearance. Admins only (checked here, and again by row level security).
 * The form sends the whole settings object as JSON in the "settings" field.
 */
export async function saveAppearanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireRole(["admin"]);

    const raw = formData.get("settings");
    let json: unknown;
    try {
      json = JSON.parse(typeof raw === "string" ? raw : "");
    } catch {
      return { status: "error", code: "invalid" };
    }
    const parsed = siteSettingsSchema.safeParse(json);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((i) => i.path.join(".")).filter(Boolean))];
      return { status: "error", code: "invalid", fields };
    }

    const client = await createSupabaseServerClient();
    const { error } = await client
      .from("site_settings")
      .upsert({ id: "site", data: parsed.data, updated_at: new Date().toISOString(), updated_by: user.id });
    if (error) {
      console.error("[appearance] save failed:", error.message);
      return { status: "error", code: "failed" };
    }

    // The editor sees the change on the next page load; every page is rebuilt with the new look.
    updateTag(SITE_SETTINGS_TAG);
    revalidatePath("/", "layout");
    return { status: "ok", message: "savedNote" };
  } catch (e) {
    if (e instanceof AuthError) return { status: "error", code: e.code };
    console.error("[appearance] action failed:", e instanceof Error ? e.message : e);
    return { status: "error", code: "failed" };
  }
}
