import { describe, expect, it } from "vitest";
import { demoChatReply, detectDirection, detectTopic } from "@/lib/ai/demo-chat";
import { parseChatText } from "@/lib/chat/markdown";
import type { ChatMessage } from "@/lib/ai/types";
import type { Locale } from "@/lib/data/types";
import stories from "@/content/stories.json";
import experiments from "@/content/experiments.json";

const user = (content: string): ChatMessage => ({ role: "user", content });

describe("detectTopic", () => {
  it.each([
    ["Я не знаю, чего хочу.", "unknown"],
    ["Родители хотят, чтобы я стал(а) врачом.", "parents"],
    ["Я ненавижу свою специальность.", "hateMajor"],
    ["Кажется, все продвигаются, кроме меня.", "comparison"],
    ["Хочу учиться за границей, но не знаю, с чего начать.", "abroad"],
    ["Мне кажется, у меня нет талантов.", "noTalent"],
    ["Хочу попробовать что-то новое, но мне страшно.", "fear"],
    ["У меня слишком много интересов.", "tooMany"],
    ["На учёбу нет денег", "money"],
    ["Мне 25, уже поздно что-то менять?", "late"],
    ["Нет сил и мотивации вообще", "tired"],
    ["привет", "greeting"],
    ["спасибо!", "thanks"],
    ["хочу стать программистом", "direction"],
    ["ну такое", "general"],
  ])("ru: %s → %s", (text, topic) => {
    expect(detectTopic(text)).toBe(topic);
  });

  it.each([
    ["My parents want me to become a doctor.", "parents"],
    ["I want to study abroad but don't know where to start.", "abroad"],
    ["I want to try something new but I'm afraid.", "fear"],
    ["Ата-анам дәрігер болғанымды қалайды", "parents"],
    ["Шетелде оқығым келеді", "abroad"],
    ["Не істерімді білмеймін", "unknown"],
  ])("en/kk: %s → %s", (text, topic) => {
    expect(detectTopic(text)).toBe(topic);
  });

  it("puts a crisis above everything else", () => {
    expect(detectTopic("Родители давят, я не хочу жить")).toBe("crisis");
    expect(detectTopic("I want to kill myself")).toBe("crisis");
  });

  it("does not treat a long message with a greeting as just a greeting", () => {
    expect(detectTopic("Привет, у меня слишком много интересов и я не могу выбрать")).toBe("tooMany");
  });
});

describe("detectDirection", () => {
  it("finds a direction by word stems in any language", () => {
    expect(detectDirection("хочу стать программистом")).toBe("programming");
    expect(detectDirection("Родители хотят, чтобы я стал врачом")).toBe("medicine");
    expect(detectDirection("I like design")).toBe("design");
    expect(detectDirection("правда не знаю")).toBeNull();
    expect(detectDirection("получил диплом")).toBeNull();
  });
});

describe("demoChatReply", () => {
  const locales: Locale[] = ["ru", "kk", "en"];

  it("answers every starter topic in every language with a question and the demo note", () => {
    for (const locale of locales) {
      for (const text of ["Я не знаю, чего хочу.", "Мне страшно", "Хочу учиться за границей"]) {
        const reply = demoChatReply([user(text)], locale);
        expect(reply.length).toBeGreaterThan(150);
        expect(reply).toContain("?");
        expect(reply).toMatch(/демо|demo/i);
      }
    }
  });

  it("links only to real stories and experiments, marking demo stories as fictional", () => {
    const storyIds = new Set(stories.map((s) => s.id));
    const reply = demoChatReply([user("Родители хотят, чтобы я стал врачом")], "ru");
    const ids = [...reply.matchAll(/\/ru\/stories\/([a-z0-9-]+)/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(storyIds.has(id)).toBe(true);
    expect(reply).toMatch(/вымышлен/);
    const medicine = experiments.find((e) => e.direction === "medicine")!;
    expect(reply).toContain(medicine.title.ru);
  });

  it("renders story and section links as clickable internal links", () => {
    const reply = demoChatReply([user("Не знаю, чего хочу")], "ru");
    const hrefs = parseChatText(reply).flatMap((b) =>
      (b.type === "p" ? b.lines : b.items).flat().flatMap((s) => (s.href ? [s.href] : [])),
    );
    expect(hrefs.some((h) => h.startsWith("/ru/stories/"))).toBe(true);
    expect(hrefs).toContain("/ru/try");
  });

  it("answers a crisis with help contacts and no career advice", () => {
    const reply = demoChatReply([user("я не хочу жить")], "ru");
    expect(reply).toContain("150");
    expect(reply).toContain("112");
    expect(reply).not.toMatch(/\/ru\/(try|stories|explore)/);
  });

  it("varies the closing question when the person keeps writing on the same topic", () => {
    const first = demoChatReply([user("мне страшно")], "ru");
    const second = demoChatReply([user("мне страшно"), { role: "assistant", content: first }, user("всё равно страшно")], "ru");
    expect(second).not.toBe(first);
  });

  it("uses the person's language from the interface, not from the message", () => {
    expect(demoChatReply([user("I am afraid")], "ru")).toMatch(/[а-я]/);
    expect(demoChatReply([user("мне страшно")], "en")).not.toMatch(/[а-я]{4}/);
  });

  it("never uses destiny wording", () => {
    for (const locale of locales) {
      for (const text of ["не знаю чего хочу", "хочу стать юристом", "ну такое", "привет"]) {
        expect(demoChatReply([user(text)], locale)).not.toMatch(/суждено|создан для|тағдыр|meant to be|destiny/i);
      }
    }
  });
});
