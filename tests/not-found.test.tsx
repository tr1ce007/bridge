import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "../messages/en.json";
import NotFound from "@/app/[locale]/not-found";

describe("localized 404 page", () => {
  it("shows translated copy and links home in the current locale", () => {
    const markup = renderToString(
      <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Almaty">
        <NotFound />
      </NextIntlClientProvider>,
    );
    const html = markup.replaceAll("&#x27;", "'");
    expect(html).toContain(en.notFound.title);
    expect(html).toContain('href="/en"');
  });
});
