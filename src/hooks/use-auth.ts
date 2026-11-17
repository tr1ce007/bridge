"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type UiRole = "user" | "moderator" | "admin";

export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "user"; id: string; email: string | null; role: UiRole };

/**
 * Who is signed in, for the UI (header menu, /auth). Guests are the default: without Supabase this
 * is `guest` immediately and nothing is loaded. The role only decides whether the "Administration"
 * link is shown; the server checks the role again (`requireRole`) on every admin page and action.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => (isSupabaseConfigured() ? { status: "loading" } : { status: "guest" }));

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const client = createSupabaseBrowserClient();
    let alive = true;

    async function apply(session: Session | null) {
      if (!session?.user) {
        if (alive) setState({ status: "guest" });
        return;
      }
      const user = session.user;
      let role: UiRole = "user";
      try {
        const { data } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (data?.role === "admin" || data?.role === "moderator") role = data.role;
      } catch {
        // no role: the menu simply has no admin link
      }
      if (alive) setState({ status: "user", id: user.id, email: user.email ?? null, role });
    }

    client.auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch(() => alive && setState({ status: "guest" }));
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      // Not awaited inside the callback: calling Supabase from here can deadlock the auth lock.
      setTimeout(() => void apply(session), 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
