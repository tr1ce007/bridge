import { XMLParser } from "fast-xml-parser";
import { collapseWhitespace, htmlToText, toIsoDate } from "./text";
import { MAX_TEXT_CHARS } from "./reddit";
import { isHttpUrl } from "@/lib/data/http-url";
import type { DiscoveredItem } from "./types";

/** Feeds are small; anything bigger is refused. */
export const MAX_FEED_CHARS = 2_000_000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: { enabled: true, maxEntityCount: 100 },
  isArray: (name) => name === "item" || name === "entry" || name === "link",
});

type Node = unknown;
const rec = (v: Node): Record<string, Node> | null => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, Node>) : null);

/** Text of a node that may be a string, a number or an object with attributes and "#text". */
function textOf(node: Node): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return textOf(node[0]);
  const r = rec(node);
  return r ? textOf(r["#text"]) : "";
}

function linkOf(node: Node): string {
  const links = Array.isArray(node) ? node : node === undefined ? [] : [node];
  let fallback = "";
  for (const l of links) {
    const r = rec(l);
    if (!r) {
      const s = textOf(l).trim();
      if (s && !fallback) fallback = s;
      continue;
    }
    const href = textOf(r["@_href"]).trim() || textOf(r["#text"]).trim();
    const rel = textOf(r["@_rel"]);
    if (!href) continue;
    if (!rel || rel === "alternate") return href;
    if (!fallback && rel !== "self") fallback = href;
  }
  return fallback;
}

/** Public byline: never an e-mail address. RSS "name@x.org (Real Name)" yields "Real Name". */
function handleOf(raw: string): string | null {
  const s = collapseWhitespace(raw);
  if (!s) return null;
  if (s.includes("@")) {
    const open = s.indexOf("(");
    const close = s.lastIndexOf(")");
    if (open >= 0 && close > open) {
      const inner = s.slice(open + 1, close).trim();
      return inner && !inner.includes("@") ? inner : null;
    }
    return null;
  }
  return s.slice(0, 80);
}

function authorOf(entry: Record<string, Node>): string | null {
  const dc = textOf(entry["dc:creator"]);
  if (dc) return handleOf(dc);
  const a = entry.author;
  const r = rec(a);
  return handleOf(r ? textOf(r.name) : textOf(a));
}

/**
 * Reads RSS 2.0 or Atom text into items. Documents with a DOCTYPE or entity declarations
 * are refused (nothing is expanded), as are very large ones. Items without an http(s) link
 * are skipped. Never throws.
 */
export function parseFeed(xml: string, source: { name: string }): DiscoveredItem[] {
  if (typeof xml !== "string" || xml.length === 0 || xml.length > MAX_FEED_CHARS) return [];
  const upper = xml.toUpperCase();
  if (upper.includes("<!DOCTYPE") || upper.includes("<!ENTITY")) return [];
  let doc: Record<string, Node> | null;
  try {
    doc = rec(parser.parse(xml));
  } catch {
    return [];
  }
  if (!doc) return [];
  const rss = rec(doc.rss);
  const atom = rec(doc.feed);
  const entries: Node[] = rec(rss?.channel) && Array.isArray(rec(rss?.channel)?.item) ? (rec(rss?.channel)!.item as Node[]) : atom && Array.isArray(atom.entry) ? (atom.entry as Node[]) : [];
  const items: DiscoveredItem[] = [];
  for (const raw of entries) {
    const e = rec(raw);
    if (!e) continue;
    const link = linkOf(e.link);
    if (!isHttpUrl(link)) continue;
    const body = textOf(e["content:encoded"]) || textOf(e.content) || textOf(e.description) || textOf(e.summary);
    const published = toIsoDate(textOf(e.pubDate) || textOf(e.published) || textOf(e.updated) || textOf(e["dc:date"]));
    const author = authorOf(e);
    items.push({
      origin: "rss",
      sourceUrl: link,
      sourceName: source.name,
      author,
      ...(published ? { publishedAt: published } : {}),
      title: htmlToText(textOf(e.title)),
      text: htmlToText(body).slice(0, MAX_TEXT_CHARS),
    });
  }
  return items;
}
