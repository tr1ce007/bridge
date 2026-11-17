import type { DiscoveryReport, ExperimentCompletion, JournalEntry } from "@/lib/data/types";
import { journalPreview } from "./journal";

export type TimelineEvent =
  | { kind: "report"; id: string; date: string; reportId: string; topDirections: string[] }
  | { kind: "experiment"; id: string; date: string; experimentId: string; answer: "process" | "idea" | "unsure" | null }
  | { kind: "journal"; id: string; date: string; preview: string };

export interface TimelineInput {
  reports: DiscoveryReport[];
  completions: ExperimentCompletion[];
  journal: JournalEntry[];
}

const KIND_ORDER = { report: 0, experiment: 1, journal: 2 } as const;

/**
 * One list of how the person's thinking moved: each report (with its top 3 directions), each
 * completed experiment and each journal entry, newest first. No scores. Entries with an
 * unreadable date are left out. Equal dates keep the order report, experiment, journal.
 */
export function buildTimeline({ reports, completions, journal }: TimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...reports.map((r): TimelineEvent => ({ kind: "report", id: r.id, date: r.createdAt, reportId: r.id, topDirections: r.directions.slice(0, 3).map((d) => d.name) })),
    ...completions.map(
      (c): TimelineEvent => ({
        kind: "experiment",
        id: c.experimentId,
        date: c.completedAt,
        experimentId: c.experimentId,
        answer: c.answer ?? (c.enjoyedProcess ? "process" : null),
      }),
    ),
    ...journal.map((j): TimelineEvent => ({ kind: "journal", id: j.id, date: j.createdAt, preview: journalPreview(j) })),
  ];
  return events
    .filter((e) => !Number.isNaN(Date.parse(e.date)))
    .map((e, index) => ({ e, index, time: Date.parse(e.date) }))
    .sort((a, b) => b.time - a.time || KIND_ORDER[a.e.kind] - KIND_ORDER[b.e.kind] || a.index - b.index)
    .map(({ e }) => e);
}
