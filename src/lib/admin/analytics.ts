export interface EventRow {
  name: string;
  created_at: string;
}

export interface DayCounts {
  /** Calendar day in Asia/Almaty, YYYY-MM-DD. */
  day: string;
  counts: Record<string, number>;
}

export interface EventAggregate {
  /** Newest day first; every day of the window is present, even with no events. */
  days: DayCounts[];
  totals: Record<string, number>;
}

const TIME_ZONE = "Asia/Almaty";
const DAY_MS = 86_400_000;

function dayOf(date: Date): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Today's date in Asia/Almaty as YYYY-MM-DD (used by "mark verified today"). */
export function todayInAlmaty(now: Date = new Date()): string {
  return dayOf(now);
}

/** Anonymous event counts per day and name for the last `days` days (including today). */
export function aggregateEventsByDay(rows: EventRow[], options: { days: number; now?: Date }): EventAggregate {
  const now = options.now ?? new Date();
  const days: DayCounts[] = Array.from({ length: options.days }, (_, i) => ({
    day: dayOf(new Date(now.getTime() - i * DAY_MS)),
    counts: {},
  }));
  const byDay = new Map(days.map((d) => [d.day, d]));
  const totals: Record<string, number> = {};
  for (const row of rows) {
    const at = new Date(row.created_at);
    if (Number.isNaN(at.getTime())) continue;
    const bucket = byDay.get(dayOf(at));
    if (!bucket) continue;
    bucket.counts[row.name] = (bucket.counts[row.name] ?? 0) + 1;
    totals[row.name] = (totals[row.name] ?? 0) + 1;
  }
  return { days, totals };
}
