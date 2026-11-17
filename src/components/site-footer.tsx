import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { Container } from "./ui/container";
import { Logo } from "./logo";

/** Footer "Project" column. `key` is the message key under `footer.*`. */
const PROJECT_LINKS = [
  { key: "about", href: "/about" },
  { key: "privacy", href: "/privacy" },
  { key: "mentors", href: "/mentors" },
  { key: "journal", href: "/journal" },
  { key: "settings", href: "/settings" },
] as const;

export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <Container className="grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">{t("tagline")}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("platform")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="text-fg/80 hover:text-fg">
                  {nav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("project")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {PROJECT_LINKS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="text-fg/80 hover:text-fg">
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <Container className="border-t border-border py-6 text-xs text-muted">
        © {year} · {t("rights")}
      </Container>
    </footer>
  );
}
