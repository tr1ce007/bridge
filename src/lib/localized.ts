import type { Locale } from "@/lib/data/types";

type Texts<T> = Partial<Record<Locale, T>>;

/** Text in `locale`, else Russian (the default language), else any language, else "". */
export function localized(text: Texts<string> | undefined | null, locale: Locale): string {
  if (!text) return "";
  return text[locale] || text.ru || text.kk || text.en || "";
}

/** List in `locale`, else Russian, else any language, else an empty list. */
export function localizedList(list: Texts<string[]> | undefined | null, locale: Locale): string[] {
  if (!list) return [];
  const pick = [list[locale], list.ru, list.kk, list.en].find((l) => l && l.length > 0);
  return pick ?? [];
}
