import type { Opportunity } from "@/lib/data/types";
import { opportunityStatus } from "@/lib/opportunities/filter";

export const DASHBOARD_OPPORTUNITIES = 3;

/**
 * Opportunities for the dashboard: the saved ones (most recently saved first, at most 3) when
 * there are any, otherwise the 3 most recently verified. Outdated and never-verified entries are
 * not offered as "recent".
 */
export function recentOpportunities(
  all: Opportunity[],
  savedIds: string[],
  now: Date,
  limit = DASHBOARD_OPPORTUNITIES,
): { source: "saved" | "recent"; items: Opportunity[] } {
  const byId = new Map(all.map((o) => [o.id, o]));
  const saved = [...savedIds].reverse().flatMap((id) => {
    const o = byId.get(id);
    return o ? [o] : [];
  });
  if (saved.length) return { source: "saved", items: saved.slice(0, limit) };
  const recent = all
    .filter((o) => opportunityStatus(o, now) === "verified")
    .sort((a, b) => (b.verifiedAt ?? "").localeCompare(a.verifiedAt ?? ""))
    .slice(0, limit);
  return { source: "recent", items: recent };
}
