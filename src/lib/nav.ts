/** Main navigation. `key` is the message key under `nav.*`. */
export const NAV_ITEMS = [
  { key: "explore", href: "/explore" },
  { key: "chat", href: "/chat" },
  { key: "try", href: "/try" },
  { key: "stories", href: "/stories" },
  { key: "opportunities", href: "/opportunities" },
  { key: "dashboard", href: "/dashboard" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

/** True when `pathname` (without locale prefix) is `href` or below it. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
