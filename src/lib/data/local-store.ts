import { z } from "zod";
import { clearAllRaw, readJson, removeRaw, writeJson } from "./storage";
import {
  conversationSchema,
  experimentCompletionSchema,
  journalEntrySchema,
  preferencesSchema,
  questionnaireSessionSchema,
  reportSchema,
  roadmapSchema,
  type Roadmap,
  type UserStore,
} from "./types";

export { storageMode } from "./storage";

const KEYS = {
  session: "session",
  reports: "reports",
  roadmap: "roadmap",
  journal: "journal",
  completions: "completions",
  preferences: "preferences",
  conversation: "conversation",
  savedStory: "saved:story",
  savedOpportunity: "saved:opportunity",
} as const;

const emptyRoadmap = (): Roadmap => ({ d7: [], d30: [], d90: [] });

/** Reads a stored array and keeps only the items that pass the schema. */
function readList<S extends z.ZodType>(key: string, schema: S): z.infer<S>[] {
  const raw = readJson<unknown>(key);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data as z.infer<S>] : [];
  });
}

function upsertBy<T>(list: T[], item: T, same: (a: T) => boolean): T[] {
  return list.some(same) ? list.map((x) => (same(x) ? item : x)) : [...list, item];
}

const newestFirst = <T extends { createdAt: string }>(a: T, b: T) =>
  b.createdAt.localeCompare(a.createdAt);

/** Browser-only store (localStorage, falls back to memory). Safe in client components. */
export function createLocalUserStore(): UserStore {
  return {
    mode: "local",

    async loadSession() {
      const parsed = questionnaireSessionSchema.safeParse(readJson(KEYS.session));
      return parsed.success ? parsed.data : null;
    },
    async saveSession(session) {
      writeJson(KEYS.session, questionnaireSessionSchema.parse(session));
    },

    async listReports() {
      return readList(KEYS.reports, reportSchema).sort(newestFirst);
    },
    async saveReport(report) {
      const valid = reportSchema.parse(report);
      const list = readList(KEYS.reports, reportSchema);
      writeJson(KEYS.reports, upsertBy(list, valid, (r) => r.id === valid.id));
    },

    async getRoadmap() {
      const parsed = roadmapSchema.safeParse(readJson(KEYS.roadmap));
      return parsed.success ? parsed.data : emptyRoadmap();
    },
    async saveRoadmap(roadmap) {
      writeJson(KEYS.roadmap, roadmapSchema.parse(roadmap));
    },

    async listJournal() {
      return readList(KEYS.journal, journalEntrySchema).sort(newestFirst);
    },
    async saveJournal(entry) {
      const valid = journalEntrySchema.parse(entry);
      const list = readList(KEYS.journal, journalEntrySchema);
      writeJson(KEYS.journal, upsertBy(list, valid, (e) => e.id === valid.id));
    },
    async deleteJournal(id) {
      const list = readList(KEYS.journal, journalEntrySchema);
      writeJson(
        KEYS.journal,
        list.filter((e) => e.id !== id),
      );
    },

    async toggleSaved(kind, id) {
      const key = kind === "story" ? KEYS.savedStory : KEYS.savedOpportunity;
      const ids = readList(key, z.string());
      const saved = ids.includes(id);
      writeJson(key, saved ? ids.filter((x) => x !== id) : [...ids, id]);
      return !saved;
    },
    async listSaved(kind) {
      return readList(kind === "story" ? KEYS.savedStory : KEYS.savedOpportunity, z.string());
    },

    async saveCompletion(completion) {
      const valid = experimentCompletionSchema.parse(completion);
      const list = readList(KEYS.completions, experimentCompletionSchema);
      writeJson(
        KEYS.completions,
        upsertBy(list, valid, (c) => c.experimentId === valid.experimentId),
      );
    },
    async listCompletions() {
      return readList(KEYS.completions, experimentCompletionSchema).sort((a, b) =>
        b.completedAt.localeCompare(a.completedAt),
      );
    },

    async loadConversation() {
      const parsed = conversationSchema.safeParse(readJson(KEYS.conversation));
      return parsed.success ? parsed.data : null;
    },
    async saveConversation(conversation) {
      writeJson(KEYS.conversation, conversationSchema.parse(conversation));
    },
    async clearConversations() {
      removeRaw(KEYS.conversation);
    },

    async getPreferences() {
      const parsed = preferencesSchema.safeParse(readJson(KEYS.preferences));
      return parsed.success ? parsed.data : { memoryConsent: false };
    },
    async savePreferences(prefs) {
      writeJson(KEYS.preferences, preferencesSchema.parse(prefs));
    },

    async clearAll() {
      clearAllRaw();
    },
  };
}
