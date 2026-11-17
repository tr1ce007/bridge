import "server-only";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { AuthError, requireRole, type SessionUser, type StaffRole } from "./roles";

export const STAFF_ROLES: readonly StaffRole[] = ["admin", "moderator"];

/**
 * `requireRole` for pages: not signed in goes to /auth, no permission (or no Supabase) is a 404.
 * Call it at the top of EVERY admin page, not only in the layout.
 */
export async function guardStaffPage(roles: readonly StaffRole[] = STAFF_ROLES): Promise<SessionUser> {
  try {
    return await requireRole(roles);
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.code === "unauthenticated") redirect({ href: "/auth", locale: (await getLocale()) as Locale });
      notFound();
    }
    throw e;
  }
}
