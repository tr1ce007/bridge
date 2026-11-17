import ru from "../../../messages/ru.json";
import kk from "../../../messages/kk.json";
import en from "../../../messages/en.json";
import type { Locale } from "@/lib/data/types";

export type StoriesApiKey = keyof typeof ru.stories.api;
const API: Record<Locale, typeof ru.stories.api> = { ru: ru.stories.api, kk: kk.stories.api, en: en.stories.api };

/** Localized text for the /api/stories routes (messages `stories.api.*`). */
export function storiesApiCopy(locale: Locale, key: StoriesApiKey): string {
  return API[locale][key];
}
