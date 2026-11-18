/** Small text helpers, written without regular expressions on untrusted input. */

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const BLOCK_TAGS = new Set(["br", "p", "div", "li", "ul", "ol", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "hr", "table"]);

/** Decodes the few HTML entities that matter (named and numeric), in one pass. */
export function decodeEntities(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "&") {
      const end = text.indexOf(";", i + 1);
      if (end > i && end - i <= 10) {
        const name = text.slice(i + 1, end);
        let decoded: string | undefined;
        if (name[0] === "#") {
          const hex = name[1] === "x" || name[1] === "X";
          const digits = name.slice(hex ? 2 : 1);
          const code = digits.length > 0 && /^[0-9a-fA-F]+$/.test(digits) ? Number.parseInt(digits, hex ? 16 : 10) : Number.NaN;
          if (Number.isFinite(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) decoded = String.fromCodePoint(code);
        } else {
          decoded = NAMED[name];
        }
        if (decoded !== undefined) {
          out += decoded;
          i = end + 1;
          continue;
        }
      }
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Collapses every run of whitespace (including line breaks) into one space. */
export function collapseWhitespace(text: string): string {
  let out = "";
  let pendingSpace = false;
  for (const ch of text) {
    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t" || ch === " " || ch === "\f" || ch === "\v") {
      pendingSpace = out.length > 0;
    } else {
      if (pendingSpace) out += " ";
      pendingSpace = false;
      out += ch;
    }
  }
  return out;
}

/** Removes HTML tags (and the content of script/style), decodes entities, collapses whitespace. */
export function htmlToText(html: string): string {
  let out = "";
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt < 0) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    const gt = html.indexOf(">", lt + 1);
    // A "<" that never closes is plain text (for example "a < b").
    if (gt < 0) {
      out += html.slice(lt);
      break;
    }
    const inner = html.slice(lt + 1, gt);
    const first = inner[0];
    // Only real tags (<p>, </p>, <!-- -->) are removed; "a < b" or "<3" stays text.
    const looksLikeTag = first === "/" || first === "!" || first === "?" || (first !== undefined && first.toLowerCase() !== first.toUpperCase());
    if (!looksLikeTag) {
      out += "<";
      i = lt + 1;
      continue;
    }
    let name = "";
    for (const ch of inner[0] === "/" ? inner.slice(1) : inner) {
      if (ch === " " || ch === "/" || ch === "\n" || ch === "\t") break;
      name += ch.toLowerCase();
    }
    if ((name === "script" || name === "style") && inner[0] !== "/") {
      const close = html.toLowerCase().indexOf(`</${name}`, gt);
      const closeEnd = close < 0 ? -1 : html.indexOf(">", close);
      i = closeEnd < 0 ? html.length : closeEnd + 1;
      continue;
    }
    if (BLOCK_TAGS.has(name)) out += " ";
    i = gt + 1;
  }
  return collapseWhitespace(decodeEntities(out));
}

/** Cuts text to at most `max` characters, at a word boundary, adding "…" when something was cut. */
export function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const room = Math.max(1, max - 1);
  let cut = chars.slice(0, room).join("");
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > room * 0.6) cut = cut.slice(0, lastSpace);
  return `${cut.trimEnd()}…`;
}

/** YYYY-MM-DD from a date string or a Date, or undefined when it is missing or not believable. */
export function toIsoDate(value: unknown, now: Date = new Date()): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const d = value instanceof Date ? value : new Date(typeof value === "number" ? value : String(value));
  const time = d.getTime();
  if (!Number.isFinite(time)) return undefined;
  const year = d.getUTCFullYear();
  if (year < 1990 || time > now.getTime() + 86_400_000) return undefined;
  return d.toISOString().slice(0, 10);
}
