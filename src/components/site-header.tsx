"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { AccountMenu } from "./auth/account-menu";
import { buttonClasses } from "./ui/button";
import { Container } from "./ui/container";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const [scrolled, setScrolled] = useState(false);

  // Close the mobile menu on navigation (including locale switches) and on Escape.
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // A hairline and a soft shadow appear only once the page moves under the header.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-bg/85 backdrop-blur-md backdrop-saturate-150 transition-[border-color,box-shadow] duration-300 supports-[not(backdrop-filter:blur(0))]:bg-bg",
        scrolled || open ? "border-border shadow-[0_1px_12px_-6px_rgb(var(--shadow-color)/0.12)]" : "border-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-2 sm:h-[4.5rem] sm:gap-4">
        <Logo />

        <nav aria-label={t("label")} className="hidden xl:block">
          <ul className="flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative block whitespace-nowrap px-3 py-2 text-[0.9rem] transition-colors duration-200",
                      "after:absolute after:inset-x-3 after:-bottom-[0.95rem] after:h-0.5 after:origin-left after:rounded-full after:bg-primary after:transition-transform after:duration-300",
                      active ? "font-medium text-fg after:scale-x-100" : "text-muted after:scale-x-0 hover:text-fg",
                    )}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LocaleSwitcher className="hidden sm:flex" />
          <ThemeToggle />
          <AccountMenu />
          {/* Wrapped: the button's own inline-flex would beat `hidden` on the same element. */}
          <span className="ml-1 hidden min-[1600px]:block">
            <Link href="/explore" className={buttonClasses("primary", "min-h-10 whitespace-nowrap px-5 text-sm")}>
              {t("cta")}
            </Link>
          </span>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-fg transition-colors hover:bg-subtle xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 9h16M4 15h10" />}
            </svg>
          </button>
        </div>
      </Container>

      {open && (
        <div
          id="mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-bg motion-safe:animate-[menu-in_0.25s_var(--ease-out-soft)] xl:hidden"
        >
          <Container className="pt-2 pb-8">
            <nav aria-label={t("label")}>
              <ul className="flex flex-col">
                {NAV_ITEMS.map((item, i) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "group flex items-baseline gap-4 border-b border-border py-4 font-display text-xl tracking-tight transition-colors",
                          active ? "font-semibold text-primary dark:text-[var(--ring)]" : "text-fg hover:text-primary",
                        )}
                      >
                        <span className="w-6 font-sans text-xs font-medium tabular-nums text-muted">0{i + 1}</span>
                        {t(item.key)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <AccountMenu variant="list" onNavigate={() => setOpen(false)} />
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/explore" onClick={() => setOpen(false)} className={buttonClasses("primary", "w-full sm:w-auto")}>
                {t("cta")}
                <span aria-hidden="true">→</span>
              </Link>
              <LocaleSwitcher className="w-fit sm:hidden" />
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
