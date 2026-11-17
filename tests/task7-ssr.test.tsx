import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "../messages/en.json";
import ru from "../messages/ru.json";
import { SiteFooter } from "@/components/site-footer";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { JournalView } from "@/components/journal/journal-view";
import { SettingsView } from "@/components/settings/settings-view";
import { InterestForm } from "@/components/mentors/interest-form";

const render = (node: React.ReactNode, locale: "ru" | "en" = "ru") =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "ru" ? ru : en} timeZone="Asia/Almaty">
      {node}
    </NextIntlClientProvider>,
  ).replaceAll("&#x27;", "'");

describe("footer and personal pages (server HTML)", () => {
  it("the footer links to About, Privacy, Mentors, Journal and Settings in the current locale", () => {
    const html = render(<SiteFooter />, "en");
    for (const href of ["/en/about", "/en/privacy", "/en/mentors", "/en/journal", "/en/settings"]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain(en.footer.journal);
  });

  it("personal pages start with a loading state, never with someone else's data or a crash", () => {
    expect(render(<DashboardView />)).toContain(ru.dashboard.loading);
    expect(render(<JournalView />)).toContain(ru.journal.loading);
    expect(render(<SettingsView />)).toContain(ru.settings.loading);
    expect(render(<InterestForm />)).toContain(ru.mentors.loading);
  });
});
