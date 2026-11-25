import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import ru from "../messages/ru.json";
import kk from "../messages/kk.json";
import en from "../messages/en.json";

vi.mock("@/lib/site-settings/actions", () => ({ saveAppearanceAction: async () => ({ status: "idle" }) }));

import { AppearanceForm } from "@/components/admin/appearance-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteSettingsProvider } from "@/components/site-settings-provider";
import { teamContact } from "@/lib/site-settings/contact";
import { LANDING_KEYS } from "@/lib/site-settings/schema";

const defaults = {
  colors: { primary: "#155eef", accent: "#155eef", navy: "#102a56" },
  contact: { phone: "+7 (776) 914 07 20", instagram: "@the.bridge.astana", email: "" },
  landing: { ru: { "hero.title": ru.landing.hero.title }, kk: {}, en: {} },
};

describe("admin → Appearance", () => {
  it("renders every part of the editor in all three languages", () => {
    for (const [locale, messages] of [["ru", ru], ["kk", kk], ["en", en]] as const) {
      const html = renderToString(
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Almaty">
          <AppearanceForm current={{ colors: { primary: "#0f4bd1" }, contact: {}, landing: { ru: { "hero.title": "Мой заголовок" } } }} defaults={defaults} />
        </NextIntlClientProvider>,
      );
      const a = messages.admin.appearance;
      for (const text of [a.colors.title, a.logo.title, a.contact.title, a.texts.title, a.texts.sections.hero, a.texts.sections.final]) {
        expect(html, locale).toContain(text.replace(/&/g, "&amp;"));
      }
      expect(html).toContain('value="#0f4bd1"');
      expect(html).toContain("Мой заголовок");
      expect(html).toContain(`name="settings"`);
    }
    expect(LANDING_KEYS.length).toBeGreaterThan(50);
  });

  it("the footer shows contacts changed in the editor", () => {
    const html = renderToString(
      <NextIntlClientProvider locale="ru" messages={ru} timeZone="Asia/Almaty">
        <SiteSettingsProvider value={{ contact: teamContact({ phone: "+7 (701) 111 22 33", instagram: "new.page" }) }}>
          <SiteFooter />
        </SiteSettingsProvider>
      </NextIntlClientProvider>,
    );
    expect(html).toContain("https://www.instagram.com/new.page/");
    expect(html).toContain("+7 (701) 111 22 33");
    expect(html).not.toContain("the.bridge.astana");
  });
});
