import type { SettingsLocale, SiteSettings } from "./schema";

type Messages = Record<string, unknown>;

function setPath(obj: Messages, path: string[], value: string): Messages {
  const [head, ...rest] = path;
  if (!rest.length) return { ...obj, [head]: value };
  const child = obj[head];
  return { ...obj, [head]: setPath(child && typeof child === "object" ? (child as Messages) : {}, rest, value) };
}

/** Messages with the editor's home-page texts for `locale` put over `landing.*` (input is not mutated). */
export function withLandingOverrides<M extends Messages>(messages: M, landing: SiteSettings["landing"], locale: string): M {
  const overrides = landing[locale as SettingsLocale];
  if (!overrides || !Object.keys(overrides).length) return messages;
  let next = (messages.landing ?? {}) as Messages;
  for (const [key, value] of Object.entries(overrides)) next = setPath(next, key.split("."), value);
  return { ...messages, landing: next };
}
