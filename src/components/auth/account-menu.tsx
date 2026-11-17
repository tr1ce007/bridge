"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/cn";
import { signOut } from "./sign-out";

/**
 * Header account control. Guests (and everyone, when Supabase is not set up) get a sign-in link;
 * a signed-in person gets a menu with their email, settings, sign out and, for staff only,
 * the Administration link. `variant="list"` is the same content flat, for the mobile menu.
 */
export function AccountMenu({ variant = "dropdown", onNavigate }: { variant?: "dropdown" | "list"; onNavigate?: () => void }) {
  const t = useTranslations("auth.menu");
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const box = useRef<HTMLDivElement>(null);

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      setOpen(false);
      onNavigate?.();
      router.refresh();
    }
  }

  if (auth.status === "loading") {
    // Same width as the sign-in link, so the header does not jump.
    return variant === "dropdown" ? <span aria-hidden="true" className="inline-block h-10 w-20" /> : null;
  }

  if (auth.status === "guest") {
    return (
      <Link
        href="/auth"
        onClick={onNavigate}
        className={
          variant === "dropdown"
            ? buttonClasses("ghost", "min-h-10 px-4")
            : "block border-b border-border py-3.5 font-display text-lg text-fg/80"
        }
      >
        {t("signIn")}
      </Link>
    );
  }

  const items = (
    <>
      <Link href="/settings" onClick={onNavigate} className="block rounded-xl px-3 py-2 text-sm hover:bg-subtle">
        {t("settings")}
      </Link>
      {auth.role !== "user" && (
        <Link href="/admin" onClick={onNavigate} className="block rounded-xl px-3 py-2 text-sm hover:bg-subtle">
          {t("admin")}
        </Link>
      )}
      <button type="button" onClick={handleSignOut} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-subtle">
        {t("signOut")}
      </button>
    </>
  );

  if (variant === "list") {
    return (
      <div className="border-b border-border py-3">
        <p className="truncate px-3 text-sm text-muted">{auth.email}</p>
        <div className="mt-1">{items}</div>
      </div>
    );
  }

  const initial = (auth.email ?? "?").charAt(0).toUpperCase();
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("openAria")}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full border border-border bg-subtle text-sm font-semibold hover:border-fg/40",
        )}
      >
        {initial}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border bg-bg p-2 shadow-lg">
          <p className="truncate px-3 py-2 text-sm text-muted">{auth.email}</p>
          {items}
        </div>
      )}
    </div>
  );
}
