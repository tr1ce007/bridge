import type {
  Opportunity,
  OpportunityCost,
  OpportunityCountry,
  OpportunityKind,
  OpportunityLevel,
  OpportunityStatus,
} from "@/lib/data/types";

/** A verification older than this many days no longer counts (shown as "outdated"). */
export const OUTDATED_AFTER_DAYS = 180;
const DAY_MS = 86_400_000;

/**
 * Status shown to the user, computed from `now` (call it at render time):
 * - never verified (no date, or an unreadable one), or stored as "unverified" -> "unverified"
 * - stored as "outdated", or verified more than 180 days before `now` -> "outdated"
 * - otherwise "verified" (a date in the future counts as verified)
 * The day count uses whole UTC days, so exactly 180 days is still "verified", 181 is "outdated".
 */
export function opportunityStatus(o: Pick<Opportunity, "verifiedAt" | "status">, now: Date): OpportunityStatus {
  if (o.status === "unverified" || !o.verifiedAt) return "unverified";
  const verified = Date.parse(`${o.verifiedAt.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(verified)) return "unverified";
  if (o.status === "outdated") return "outdated";
  const days = Math.floor((now.getTime() - verified) / DAY_MS);
  return days > OUTDATED_AFTER_DAYS ? "outdated" : "verified";
}

export interface OpportunityQuery {
  /** Case-insensitive substring over name and descriptions. */
  q?: string;
  kind?: OpportunityKind;
  country?: OpportunityCountry;
  level?: OpportunityLevel;
  cost?: OpportunityCost;
  /** Computed status (see `opportunityStatus`). */
  status?: OpportunityStatus;
}

export function hasActiveOpportunityFilter(query: OpportunityQuery): boolean {
  return Boolean(query.q?.trim() || query.kind || query.country || query.level || query.cost || query.status);
}

/** AND of all active filters; outdated entries are kept (they carry a label). Input order is kept. */
export function filterOpportunities(list: Opportunity[], query: OpportunityQuery, now: Date): Opportunity[] {
  const q = query.q?.trim().toLowerCase();
  return list.filter((o) => {
    if (query.kind && o.kind !== query.kind) return false;
    if (query.country && o.country !== query.country) return false;
    if (query.level && !o.levels.includes(query.level) && !o.levels.includes("any")) return false;
    if (query.cost && o.cost !== query.cost) return false;
    if (query.status && opportunityStatus(o, now) !== query.status) return false;
    if (q) {
      const hay = `${o.name} ${Object.values(o.description).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
