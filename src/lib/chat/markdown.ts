/**
 * A tiny, safe subset of markdown for assistant text: paragraphs, bullet / numbered lists, **bold**, and
 * links to a few of our own pages. The result is plain data that React renders as elements, so nothing the
 * model (or an attacker) writes can become HTML.
 */
export interface Inline {
  text: string;
  bold?: boolean;
  /** Only ever one of our own pages, see INTERNAL_LINK. */
  href?: string;
}
export type Block = { type: "p"; lines: Inline[][] } | { type: "ul" | "ol"; items: Inline[][] };

/** `/ru/explore` style paths of existing sections (the demo answer contains them). Not part of a longer word or URL. */
const INTERNAL_LINK = /(?<![\w/.:@-])\/(?:ru|kk|en)\/(?:explore|stories|try|opportunities)(?![\w/-])/g;
const BULLET = /^\s*(?:[-*•])\s+(.*)$/;
const NUMBERED = /^\s*\d{1,3}[.)]\s+(.*)$/;
const HEADING = /^\s{0,3}#{1,6}\s+(.*)$/;

function linkify(text: string, bold?: boolean): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INTERNAL_LINK)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), ...(bold ? { bold } : {}) });
    out.push({ text: match[0], href: match[0], ...(bold ? { bold } : {}) });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), ...(bold ? { bold } : {}) });
  return out;
}

function inline(line: string): Inline[] {
  const out: Inline[] = [];
  let rest = line;
  while (rest) {
    const open = rest.indexOf("**");
    const close = open >= 0 ? rest.indexOf("**", open + 2) : -1;
    if (open < 0 || close < 0 || close === open + 2) {
      out.push(...linkify(rest));
      break;
    }
    if (open > 0) out.push(...linkify(rest.slice(0, open)));
    out.push(...linkify(rest.slice(open + 2, close), true));
    rest = rest.slice(close + 2);
  }
  return out;
}

export function parseChatText(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: Inline[][] | null = null;
  let list: { type: "ul" | "ol"; items: Inline[][] } | null = null;
  const flush = () => {
    if (paragraph) blocks.push({ type: "p", lines: paragraph });
    if (list) blocks.push(list);
    paragraph = null;
    list = null;
  };

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!raw.trim()) {
      flush();
      continue;
    }
    const bullet = BULLET.exec(raw);
    const numbered = bullet ? null : NUMBERED.exec(raw);
    const item = bullet ?? numbered;
    if (item) {
      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) {
        flush();
        list = { type, items: [] };
      }
      list.items.push(inline(item[1].trim()));
      continue;
    }
    const heading = HEADING.exec(raw);
    if (heading) {
      flush();
      blocks.push({ type: "p", lines: [[{ text: heading[1].trim(), bold: true }]] });
      continue;
    }
    if (list) flush();
    (paragraph ??= []).push(inline(raw.trim()));
  }
  flush();
  return blocks;
}
