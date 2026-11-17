import type { DiscoveryReport } from "@/lib/data/types";

/** Saved-direction id: the report id and the position of the direction in that report. */
export function directionSavedId(reportId: string, index: number): string {
  return `${reportId}:${index}`;
}

export function parseDirectionId(id: string): { reportId: string; index: number } | null {
  const cut = id.lastIndexOf(":");
  if (cut <= 0) return null;
  const tail = id.slice(cut + 1);
  if (!/^\d+$/.test(tail)) return null;
  return { reportId: id.slice(0, cut), index: Number(tail) };
}

export interface SavedDirection {
  id: string;
  reportId: string;
  index: number;
  name: string;
  why: string;
  reportDate: string;
}

/** Saved ids -> directions of their reports (in the order saved). Ids that no longer resolve are skipped. */
export function resolveSavedDirections(ids: string[], reports: DiscoveryReport[]): SavedDirection[] {
  const byId = new Map(reports.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const parsed = parseDirectionId(id);
    const report = parsed ? byId.get(parsed.reportId) : undefined;
    const direction = parsed && report ? report.directions[parsed.index] : undefined;
    if (!parsed || !report || !direction) return [];
    return [{ id, reportId: report.id, index: parsed.index, name: direction.name, why: direction.why, reportDate: report.createdAt }];
  });
}
