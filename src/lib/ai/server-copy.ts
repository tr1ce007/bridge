import ru from "../../../messages/ru.json";
import kk from "../../../messages/kk.json";
import en from "../../../messages/en.json";
import type { Locale } from "@/lib/data/types";

type AICopyKey = keyof typeof ru.ai;
const AI: Record<Locale, typeof ru.ai> = { ru: ru.ai, kk: kk.ai, en: en.ai };

/** Localized server-side copy for the AI routes (messages `ai.*`), with {placeholders} filled. */
export function aiCopy(locale: Locale, key: AICopyKey, vars: Record<string, string> = {}): string {
  return AI[locale][key].replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

/** The demo-mode chat answer with links to the sections that work without AI. */
export function demoChatText(locale: Locale): string {
  return aiCopy(locale, "demoChat", { explore: `/${locale}/explore`, stories: `/${locale}/stories`, try: `/${locale}/try` });
}
