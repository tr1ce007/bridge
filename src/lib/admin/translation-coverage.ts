export type MessageTree = { [key: string]: MessageTree | string | number | boolean | null | MessageTree[] };

/** `{a: {b: "x"}}` becomes `{"a.b": "x"}`. Only string leaves are kept. */
export function flattenMessages(tree: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (!tree || typeof tree !== "object") return out;
  for (const [key, value] of Object.entries(tree as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else if (value && typeof value === "object") Object.assign(out, flattenMessages(value, path));
  }
  return out;
}

export interface LocaleCoverage {
  /** Key exists in ru but is absent or empty here. */
  missing: string[];
  /** Same text as ru (probably not translated yet). Strings without letters (numbers, symbols) are ignored. */
  identical: string[];
  /** Key exists here but not in ru. */
  extra: string[];
}

export interface TranslationCoverage {
  /** Number of keys in ru. */
  total: number;
  kk: LocaleCoverage;
  en: LocaleCoverage;
}

const HAS_LETTER = /\p{L}/u;

function compare(ru: Record<string, string>, other: Record<string, string>): LocaleCoverage {
  const missing: string[] = [];
  const identical: string[] = [];
  for (const [key, ruValue] of Object.entries(ru)) {
    const value = other[key];
    if (value === undefined || value.trim() === "") missing.push(key);
    else if (value === ruValue && HAS_LETTER.test(ruValue)) identical.push(key);
  }
  const extra = Object.keys(other).filter((k) => !(k in ru));
  return { missing, identical, extra };
}

/** Which message keys still need a translation. Read-only: copy is edited in messages/*.json. */
export function computeTranslationCoverage(messages: { ru: unknown; kk: unknown; en: unknown }): TranslationCoverage {
  const ru = flattenMessages(messages.ru);
  return {
    total: Object.keys(ru).length,
    kk: compare(ru, flattenMessages(messages.kk)),
    en: compare(ru, flattenMessages(messages.en)),
  };
}
