"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

/** RU / KK / EN links that keep the current path. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("locale");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className={cn("flex items-center rounded-full border border-border bg-card p-0.5", className)}>
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={pathname}
            locale={l}
            hrefLang={l}
            lang={l}
            title={t(l)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider transition-colors duration-200",
              active ? "bg-primary-soft text-primary dark:text-[var(--ring)]" : "text-muted hover:text-fg",
            )}
          >
            {l}
          </Link>
        );
      })}
    </nav>
  );
}
