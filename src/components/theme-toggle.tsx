"use client";

import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import { ensureThemeApplied, readStoredTheme, storeTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/cn";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

// The theme lives on <html data-theme>, set before paint by themeInitScript.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getSnapshot = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const getServerSnapshot = () => null;

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("theme");
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureThemeApplied();

    // Without an explicit choice, keep following the OS setting live.
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      if (!readStoredTheme()) applyTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? t("toLight") : t("toDark");

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next);
        storeTheme(next);
      }}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-fg",
        className,
      )}
    >
      {/* Icon is chosen by CSS so it is right even before hydration. */}
      <svg viewBox="0 0 24 24" className="size-[18px] dark:hidden" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 24 24" className="hidden size-[18px] dark:block" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" strokeLinecap="round" />
      </svg>
    </button>
  );
}
