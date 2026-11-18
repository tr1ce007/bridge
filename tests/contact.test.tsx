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
  it("no email: shows the team's phone and Instagram, and no mailto", () => {
    const html = render({ variant: "general", email: null });
    expect(html).toContain('href="tel:+77769140720"');
    expect(html).toContain("+7 (776) 914 07 20");
    expect(html).toContain('href="https://www.instagram.com/the.bridge.astana/"');
    expect(html).not.toContain("mailto:");
    expect(render({ variant: "delete", email: null })).toContain("Instagram @the.bridge.astana");
  });

  it("set: shows the address as a mailto link", () => {
    const html = render({ variant: "delete", email: "team@example.kz" });
    expect(html).toContain('href="mailto:team@example.kz"');
    expect(html).toContain(">team@example.kz</a>");
    expect(html).toContain("tel:+77769140720");
    expect(render({ variant: "general", email: "team@example.kz" }, "en")).toContain("Contact the team");
  });
});
