import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "moderator";
export type Role = "user" | StaffRole;

export interface SessionUser {
  id: string;
  email: string | null;
  role: Role;
}

export type AuthErrorCode = "unauthenticated" | "forbidden" | "unconfigured";

/** Thrown by `requireRole`. Pages turn it into a redirect / 404, actions and routes into an error result. */
export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
  }
}

const KNOWN_ROLES: readonly Role[] = ["user", "moderator", "admin"];

/**
 * The signed-in user and their role, read on the server.
 * - Returns null without Supabase or without a valid session.
 * - Uses `auth.getUser()`, which asks the auth server to check the token, not the unverified
 *   cookie. The role comes from `profiles.role` (a user can read their own row; they cannot
 *   change it: see the `profiles_update_own` policy).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await client.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const role = KNOWN_ROLES.find((r) => r === profile?.role) ?? "user";
  return { id: data.user.id, email: data.user.email ?? null, role };
}

/**
 * Server-side permission check. Call it first in every admin page, server action and route
 * handler; a layout check is not enough (pages render separately and actions are plain POSTs).
 * Returns the user, or throws `AuthError`:
 * - "unconfigured": Supabase is not set up, so nobody can hold a role
 * - "unauthenticated": nobody is signed in
 * - "forbidden": signed in, but the role is not in `roles` (an empty list denies everyone)
 */
export async function requireRole(roles: readonly StaffRole[]): Promise<SessionUser> {
  if (!isSupabaseConfigured()) throw new AuthError("unconfigured");
  const user = await getSessionUser();
  if (!user) throw new AuthError("unauthenticated");
  if (user.role === "user" || !roles.includes(user.role)) throw new AuthError("forbidden");
  return user;
}
