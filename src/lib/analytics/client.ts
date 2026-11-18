import type { ClientEvent } from "./events";

const PREFIX = "bridge:counted:";

/** Almaty calendar day, so "one visit per person per day" matches the admin table's days. */
function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty" }).format(new Date());
}

/**
 * Reports an anonymous event at most once per browser per day (per `scope`), so the admin counts
 * people rather than page loads. Never throws and never blocks the page.
 */
export function countOncePerDay(name: ClientEvent, locale: string, scope: string = name): void {
  try {
    const key = PREFIX + scope;
    const day = today();
    if (localStorage.getItem(key) === day) return;
    localStorage.setItem(key, day);
  } catch {
    // storage blocked (private mode): still count, at worst once per page load
  }
  try {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, locale }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // analytics must never break the page
  }
}
