import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { withLandingOverrides } from "@/lib/site-settings/landing";
import { getSiteSettings } from "@/lib/site-settings/load";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;
  // Home-page texts changed in admin → Appearance replace the bundled ones.
  const { landing } = await getSiteSettings();

  return {
    locale,
    timeZone: "Asia/Almaty",
    messages: withLandingOverrides(messages, landing, locale),
  };
});
