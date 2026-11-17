import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import ru from "../messages/ru.json";
import { Hero } from "@/components/landing/hero";
import { Section } from "@/components/ui/section";
import { BridgeLine } from "@/components/bridge-line";

function render(node: ReactNode) {
  return renderToString(
    <NextIntlClientProvider locale="ru" messages={ru} timeZone="Asia/Almaty">
      {node}
    </NextIntlClientProvider>,
  );
}

// Content must be readable in the server HTML (before hydration / without JS).
const HIDDEN = /opacity:\s*0(?![.\d])|stroke-dashoffset:\s*1(?![.\d])/;

describe("server-rendered markup is visible", () => {
  it("Hero renders its headline without hidden styles", () => {
    const html = render(<Hero />);
    expect(html).toContain(ru.landing.hero.title);
    expect(html).not.toMatch(HIDDEN);
  });

  it("Section header and content render without hidden styles", () => {
    const html = render(
      <Section id="demo" eyebrow="Eyebrow" title="Title" lead="Lead">
        <p>Body</p>
      </Section>,
    );
    expect(html).toContain("Title");
    expect(html).toContain('aria-labelledby="demo-title"');
    expect(html).not.toMatch(HIDDEN);
  });

  it("BridgeLine renders without hidden styles", () => {
    expect(render(<BridgeLine />)).not.toMatch(HIDDEN);
  });
});
