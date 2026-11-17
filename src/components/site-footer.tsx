import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { Container } from "./ui/container";
import { Logo } from "./logo";

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
            <li>
              <Link href="/about" className="text-fg/80 hover:text-fg">
                {t("about")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-fg/80 hover:text-fg">
                {t("privacy")}
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <Container className="border-t border-border py-6 text-xs text-muted">
        © {year} · {t("rights")}
      </Container>
    </footer>
  );
}
