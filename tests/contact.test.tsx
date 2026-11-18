import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import ru from "../messages/ru.json";
import en from "../messages/en.json";
import { ContactNote } from "@/components/contact-note";
import { contactInfo } from "@/lib/contact";

describe("contactInfo", () => {
  it("is null when the variable is unset, empty or not an address (never invents one)", () => {
    expect(contactInfo(undefined)).toBeNull();
    expect(contactInfo("")).toBeNull();
    expect(contactInfo("   ")).toBeNull();
    expect(contactInfo("not an email")).toBeNull();
    expect(contactInfo("a@b")).toBeNull();
    expect(contactInfo("<script>@x.kz")).toBeNull();
  });

  it("returns the address and a mailto link when it is set", () => {
    expect(contactInfo(" team@example.kz ")).toEqual({ email: "team@example.kz", href: "mailto:team@example.kz" });
  });
});

const render = (props: Parameters<typeof ContactNote>[0], locale: "ru" | "en" = "ru") =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "ru" ? ru : en} timeZone="Asia/Almaty">
      <ContactNote {...props} />
    </NextIntlClientProvider>,
  );

describe("ContactNote", () => {
  it("unset: says honestly that the contact will appear, and has no link", () => {
    const html = render({ variant: "general", email: null });
    expect(html).toContain("Контакт команды скоро появится на этой странице.");
    expect(html).not.toContain("mailto:");
    expect(render({ variant: "delete", email: null })).toContain("Контакт команды скоро появится на этой странице.");
  });

  it("set: shows the address as a mailto link", () => {
    const html = render({ variant: "delete", email: "team@example.kz" });
    expect(html).toContain('href="mailto:team@example.kz"');
    expect(html).toContain(">team@example.kz</a>");
    expect(html).not.toContain("скоро появится");
    expect(render({ variant: "general", email: "team@example.kz" }, "en")).toContain("Contact the team");
  });
});
