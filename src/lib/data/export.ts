import { loadMentorInterest, type MentorInterest } from "@/lib/mentors/interest";
import { listStarted } from "@/lib/experiments/progress";
import type { StorageMode } from "./storage";
import type { Conversation, DiscoveryReport, ExperimentCompletion, JournalEntry, Preferences, QuestionnaireSession, Roadmap, UserStore } from "./types";

export const EXPORT_VERSION = 1;

/** The person's data, as read from the store and from this device. */
export interface ExportData {
  session: QuestionnaireSession | null;
  reports: DiscoveryReport[];
  roadmap: Roadmap;
  journal: JournalEntry[];
  saved: { story: string[]; opportunity: string[]; direction: string[] };
  completions: ExperimentCompletion[];
  conversation: Conversation | null;
  preferences: Preferences;
  /** Experiments started but not finished (kept on this device only). */
  startedExperiments: string[];
  /** The mentor-programme interest form (kept in this browser only). */
  mentorInterest: MentorInterest | null;
}

export interface ExportPayload {
  app: "the-bridge";
  version: number;
  exportedAt: string;
  /** Where the data was read from: this browser ("local"), memory only, or the account. */
  storage: StorageMode | "account";
  data: ExportData;
}

/** Reads everything the person has stored. A part that cannot be read becomes empty instead of failing the whole export. */
export async function collectExportData(store: UserStore): Promise<ExportData> {
  const safe = async <T>(read: () => Promise<T>, empty: T): Promise<T> => {
    try {
      return await read();
    } catch {
      return empty;
    }
  };
  const [session, reports, roadmap, journal, story, opportunity, direction, completions, conversation, preferences] = await Promise.all([
    safe(() => store.loadSession(), null),
    safe(() => store.listReports(), []),
    safe(() => store.getRoadmap(), { d7: [], d30: [], d90: [] }),
    safe(() => store.listJournal(), []),
    safe(() => store.listSaved("story"), []),
    safe(() => store.listSaved("opportunity"), []),
    safe(() => store.listSaved("direction"), []),
    safe(() => store.listCompletions(), []),
    safe(() => store.loadConversation(), null),
    safe(() => store.getPreferences(), { memoryConsent: false }),
  ]);
  return {
    session,
    reports,
    roadmap,
    journal,
    saved: { story, opportunity, direction },
    completions,
    conversation,
    preferences,
    startedExperiments: listStarted(),
    mentorInterest: loadMentorInterest(),
  };
}

export function buildExportPayload(data: ExportData, meta: { exportedAt: Date; storage: ExportPayload["storage"] }): ExportPayload {
  return { app: "the-bridge", version: EXPORT_VERSION, exportedAt: meta.exportedAt.toISOString(), storage: meta.storage, data };
}

/** File name with the person's local date (not UTC, so late evenings in Astana do not show yesterday). */
export function exportFileName(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `the-bridge-data-${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}.json`;
}
