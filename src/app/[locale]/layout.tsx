import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";
import { teamContact } from "@/lib/site-settings/contact";
import { getSiteSettings } from "@/lib/site-settings/load";
import { logoUrl } from "@/lib/site-settings/logo";
import { themeCss } from "@/lib/site-settings/theme";
import { themeInitScript } from "@/lib/theme";
import { GuestImportBanner } from "@/components/auth/guest-import-banner";
import { MotionProvider } from "@/components/motion-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteSettingsProvider } from "@/components/site-settings-provider";
import { VisitCounter } from "@/components/visit-counter";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-manrope", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s · THE BRIDGE` },
    description: t("description"),
    // Link previews in chats and social networks; the image comes from ./opengraph-image.tsx.
    openGraph: {
      type: "website",
      siteName: "THE BRIDGE",
      title: t("title"),
      description: t("description"),
      locale: { ru: "ru_RU", kk: "kk_KZ", en: "en_US" }[locale],
      url: `/${locale}`,
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    alternates: { languages: { ru: "/ru", kk: "/kk", en: "/en" } },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const settings = await getSiteSettings();
  const css = themeCss(settings.colors);
  const siteValue = { contact: teamContact(settings.contact), logo: logoUrl(settings.logo) };

  return (
    <html lang={locale} className={`${inter.variable} ${manrope.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint (no flash of the wrong theme). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Colours from admin → Appearance (validated #rrggbb values only). */}
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      </head>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <SiteSettingsProvider value={siteValue}>
            <MotionProvider>
              <SiteHeader />
              <GuestImportBanner />
              <main className="flex-1">{children}</main>
              <SiteFooter />
              <VisitCounter />
            </MotionProvider>
          </SiteSettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
