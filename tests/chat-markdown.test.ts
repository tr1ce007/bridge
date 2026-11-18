import { describe, expect, it } from "vitest";
import { parseChatText } from "@/lib/chat/markdown";

describe("parseChatText", () => {
  it("splits paragraphs on blank lines and keeps single line breaks inside one", () => {
    const blocks = parseChatText("Первый абзац\nвторая строка\n\nВторой абзац");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: "p" });
    expect((blocks[0] as { lines: unknown[] }).lines).toHaveLength(2);
  });

  it("reads bullet and numbered lists", () => {
    const blocks = parseChatText("Варианты:\n- один\n- два\n\n1. первый\n2) второй\n• точка");
    expect(blocks.map((b) => b.type)).toEqual(["p", "ul", "ol", "ul"]);
    expect((blocks[1] as { items: unknown[] }).items).toHaveLength(2);
    expect((blocks[2] as { items: unknown[] }).items).toHaveLength(2);
  });

  it("marks **bold** and leaves an unclosed ** as plain text", () => {
    const [p] = parseChatText("Это **важно** и **не закрыто");
    const line = (p as { lines: { text: string; bold?: boolean }[][] }).lines[0];
    expect(line.map((s) => [s.text, !!s.bold])).toEqual([
      ["Это ", false],
      ["важно", true],
      [" и **не закрыто", false],
    ]);
  });

  it("never produces HTML: markup stays literal text", () => {
    const [p] = parseChatText('<img src=x onerror="alert(1)"> <script>x</script> [a](javascript:alert(1))');
    const segs = (p as { lines: { text: string; href?: string }[][] }).lines[0];
    expect(segs.every((s) => s.href === undefined)).toBe(true);
    expect(segs.map((s) => s.text).join("")).toContain("<img src=x");
  });

  it("links only the known internal pages", () => {
    const [p] = parseChatText("Пройти анкету — /ru/explore, а это /ru/secret и https://evil.example/ru/explore");
    const segs = (p as { lines: { text: string; href?: string }[][] }).lines[0];
    const links = segs.filter((s) => s.href);
    expect(links).toEqual([{ text: "/ru/explore", href: "/ru/explore" }]);
  });

  it("turns headings into a bold line and ignores empty input", () => {
    const [h] = parseChatText("## Что дальше");
    expect((h as { lines: { bold?: boolean }[][] }).lines[0][0].bold).toBe(true);
    expect(parseChatText("")).toEqual([]);
    expect(parseChatText("\n\n  \n")).toEqual([]);
  });

  it("reads [label](internal page) links and leaves other labelled links as text", () => {
    const [p] = parseChatText("Почитай [Открыть историю](/ru/stories/demo-at-27) и [тут](https://evil.example) или [x](/ru/secret)");
    const segs = (p as { lines: { text: string; href?: string }[][] }).lines[0];
    expect(segs.filter((s) => s.href)).toEqual([{ text: "Открыть историю", href: "/ru/stories/demo-at-27" }]);
    expect(segs.map((s) => s.text).join("")).toContain("[тут](https://evil.example)");
  });
});
