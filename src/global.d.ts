import type { routing } from "@/i18n/routing";
import type messages from "../messages/ru.json";

// Typed next-intl: t("…") keys are checked against messages/ru.json at compile time.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
