import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { TEAM_CONTACT } from "@/lib/contact";
import { ContactNote } from "./contact-note";
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
    // Deep navy in both themes: the dark token set keeps every child readable.
    <footer data-theme="dark" className="relative isolate overflow-hidden bg-[#102a56] text-fg">
      {/* The bridge silhouette spans the top of the footer. */}
      <svg aria-hidden="true" viewBox="0 0 1200 90" preserveAspectRatio="none" fill="none" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-20 w-full">
        <path d="M0 0 Q150 40 300 8 Q600 110 900 8 Q1050 40 1200 0" stroke="#3b7bf6" strokeOpacity="0.45" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      </svg>
      <Container className="grid gap-12 pt-20 pb-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-6 max-w-sm font-display text-lg leading-snug tracking-tight text-white/90">{t("tagline")}</p>
          <ContactNote variant="general" className="mt-4 max-w-sm text-sm leading-relaxed text-white/60" />
          <a
            href={TEAM_CONTACT.instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram @the.bridge.astana"
            className="mt-5 inline-flex size-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-white/40 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">{t("platform")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="text-white/75 transition-colors hover:text-white">
                  {nav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">{t("project")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {PROJECT_LINKS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="text-white/75 transition-colors hover:text-white">
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <Container className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-white/50 sm:flex-row sm:justify-between">
        <span>
          © {year} · {t("rights")}
        </span>
        <span className="font-display font-semibold tracking-[0.2em] text-white/40">THE BRIDGE</span>
      </Container>
    </footer>
  );
}
