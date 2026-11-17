import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import ru from "../messages/ru.json";
import kk from "../messages/kk.json";
import en from "../messages/en.json";
import { ChatView } from "@/components/chat/chat-view";

const render = (locale: "ru" | "kk" | "en", messages: typeof ru) =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Almaty">
      <ChatView />
    </NextIntlClientProvider>,
  );

describe("/chat server HTML", () => {
  it("renders the intro, all eight starters, the disclaimer and an unchecked memory switch", () => {
    const html = render("ru", ru);
    expect(html).toContain(ru.chat.intro);
    for (const key of ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const) {
      expect(html).toContain(ru.chat[key].replace(/"/g, "&quot;"));
    }
    expect(html).toContain(ru.chat.disclaimer);
    expect(html).toContain(ru.chat.memoryLabel);
    expect(html).toMatch(/role="switch"[^>]*aria-checked="false"|aria-checked="false"[^>]*role="switch"/);
    expect(html).toContain('maxLength="4000"');
    expect(html).not.toMatch(/opacity:\s*0(?![.\d])/);
    // The demo banner appears only after /api/ai/status said so.
    expect(html).not.toContain(ru.chat.demoBanner);
  });

  it("uses the exact required Russian copy", () => {
    expect(ru.chat.memoryLabel).toBe("Запоминать мои ответы в этом браузере");
    expect(ru.chat.demoBanner).toBe("Демо‑режим: ИИ не подключён");
    expect(ru.chat.clear).toBe("Очистить разговор");
    expect(ru.chat.disclaimer).toBe("Я ИИ‑собеседник, не психолог. Если тебе очень тяжело — обратись к близким или специалисту.");
    expect(ru.chat.disclaimer).not.toMatch(/\d{3}/); // no phone numbers
  });

  it("renders in kk and en", () => {
    expect(render("kk", kk as typeof ru)).toContain(kk.chat.disclaimer);
    expect(render("en", en as typeof ru)).toContain(en.chat.s3);
  });
});
