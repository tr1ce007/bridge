"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { key: "overview", href: "/admin" },
  { key: "stories", href: "/admin/stories" },
  { key: "reports", href: "/admin/reports" },
  { key: "opportunities", href: "/admin/opportunities" },
  { key: "sources", href: "/admin/sources" },
  { key: "aiFailures", href: "/admin/ai-failures" },
  { key: "analytics", href: "/admin/analytics" },
  { key: "appearance", href: "/admin/appearance", adminOnly: true },
  { key: "translations", href: "/admin/translations", adminOnly: true },
] as const;

/** Section tabs. The appearance and translations tabs are shown to admins only (the page checks the role again). */
export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 border-b border-border pb-px sm:w-auto sm:flex-wrap">
        {ITEMS.filter((i) => !("adminOnly" in i) || isAdmin).map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-t-xl border-b-2 px-3 py-2.5 text-sm transition-colors",
                  active ? "border-primary font-semibold text-fg" : "border-transparent text-muted hover:text-fg",
                )}
              >
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
