import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createLocalUserStore } from "@/lib/data/local-store";
import { resetStorageState, storageMode } from "@/lib/data/storage";
import type { QuestionnaireSession, JournalEntry } from "@/lib/data/types";

function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    _data: data,
  };
}

const session: QuestionnaireSession = {
  id: "s1",
  answers: [
    { questionId: "a1", value: "school" },
    { questionId: "b2", value: ["tech", "people"] },
    { questionId: "c3", value: "", skipped: true },
  ],
  currentId: "d4",
  startedAt: "2026-11-17T10:00:00.000Z",
  updatedAt: "2026-11-17T10:05:00.000Z",
};

const entry: JournalEntry = {
  id: "j1",
  text: "Сегодня попробовал эксперимент",
  createdAt: "2026-11-17T12:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("local user store", () => {
  let ls: ReturnType<typeof fakeLocalStorage>;
  beforeEach(() => {
    ls = fakeLocalStorage();
    vi.stubGlobal("window", { localStorage: ls });
    resetStorageState();
  });

  it("saves and loads session", async () => {
    const store = createLocalUserStore();
    expect(await store.loadSession()).toBeNull();
    await store.saveSession(session);
    expect(await store.loadSession()).toEqual(session);
    // stored under the bridge: prefix, in real localStorage
    expect([...ls._data.keys()].every((k) => k.startsWith("bridge:"))).toBe(true);
    expect(storageMode()).toBe("local");
  });

  it("ignores corrupt stored data instead of crashing", async () => {
    ls.setItem("bridge:session", "{not json");
    ls.setItem("bridge:reports", JSON.stringify([{ nope: true }]));
    const store = createLocalUserStore();
    expect(await store.loadSession()).toBeNull();
    expect(await store.listReports()).toEqual([]);
  });

  it("memory fallback", async () => {
    const throwing = {
      length: 0,
      key: () => null,
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("denied", "QuotaExceededError");
      },
      removeItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
      clear: () => {},
    };
    vi.stubGlobal("window", { localStorage: throwing });
    resetStorageState();
    const store = createLocalUserStore();
    await store.saveSession(session);
    await store.saveJournal(entry);
    expect(await store.loadSession()).toEqual(session);
    expect(await store.listJournal()).toEqual([entry]);
    expect(storageMode()).toBe("memory");
  });

  it("memory fallback when localStorage does not exist at all", async () => {
    vi.stubGlobal("window", { localStorage: undefined });
    resetStorageState();
    const store = createLocalUserStore();
    await store.saveSession(session);
    expect(await store.loadSession()).toEqual(session);
    expect(storageMode()).toBe("memory");
  });

  it("clearAll removes everything", async () => {
    const store = createLocalUserStore();
    await store.saveSession(session);
    await store.saveJournal(entry);
    await store.toggleSaved("story", "demo-1");
    await store.saveRoadmap({
      d7: [{ id: "r1", text: "Поговорить с кураторами", done: false }],
      d30: [],
      d90: [],
    });
    ls.setItem("other-app:key", "keep"); // not ours, must survive
    await store.clearAll();
    expect(await store.loadSession()).toBeNull();
    expect(await store.listJournal()).toEqual([]);
    expect(await store.listSaved("story")).toEqual([]);
    expect(await store.getRoadmap()).toEqual({ d7: [], d30: [], d90: [] });
    expect([...ls._data.keys()]).toEqual(["other-app:key"]);
  });

  it("clearAll also wipes memory data", async () => {
    vi.stubGlobal("window", { localStorage: undefined });
    resetStorageState();
    const store = createLocalUserStore();
    await store.saveSession(session);
    await store.clearAll();
    expect(await store.loadSession()).toBeNull();
  });

  it("toggles saved items and lists them per kind", async () => {
    const store = createLocalUserStore();
    expect(await store.toggleSaved("story", "a")).toBe(true);
    expect(await store.toggleSaved("story", "b")).toBe(true);
    expect(await store.toggleSaved("opportunity", "a")).toBe(true);
    expect(await store.listSaved("story")).toEqual(["a", "b"]);
    expect(await store.toggleSaved("story", "a")).toBe(false);
    expect(await store.listSaved("story")).toEqual(["b"]);
    expect(await store.listSaved("opportunity")).toEqual(["a"]);
  });

  it("upserts journal entries by id, newest first, and deletes", async () => {
    const store = createLocalUserStore();
    await store.saveJournal(entry);
    await store.saveJournal({ id: "j2", text: "Второе", createdAt: "2026-11-18T09:00:00.000Z" });
    await store.saveJournal({ ...entry, text: "Исправлено" });
    const list = await store.listJournal();
    expect(list.map((e) => e.id)).toEqual(["j2", "j1"]);
    expect(list[1].text).toBe("Исправлено");
    await store.deleteJournal("j2");
    expect((await store.listJournal()).map((e) => e.id)).toEqual(["j1"]);
  });

  it("journal keeps the five reflection fields through save, edit and reload", async () => {
    const store = createLocalUserStore();
    const full: JournalEntry = {
      id: "j9",
      text: "",
      tried: "Позвонил знакомому юристу",
      learned: "Работа — это в основном чтение",
      surprised: "Было интересно",
      disliked: "Бумажная рутина",
      next: "Сходить на открытое занятие",
      createdAt: "2026-11-18T10:00:00.000Z",
    };
    await store.saveJournal(full);
    expect(await store.listJournal()).toEqual([full]);
    await store.saveJournal({ ...full, disliked: undefined, updatedAt: "2026-11-18T11:00:00.000Z" });
    const [edited] = await store.listJournal();
    expect(edited.disliked).toBeUndefined();
    expect(edited.updatedAt).toBe("2026-11-18T11:00:00.000Z");
    expect(edited.tried).toBe(full.tried);
    // an over-long field is refused instead of silently cut
    await expect(store.saveJournal({ ...full, tried: "x".repeat(2001) })).rejects.toThrow();
  });

  it("saves directions by report id and index, separately from stories", async () => {
    const store = createLocalUserStore();
    expect(await store.toggleSaved("direction", "report-1:0")).toBe(true);
    expect(await store.toggleSaved("direction", "report-1:3")).toBe(true);
    expect(await store.toggleSaved("story", "report-1:0")).toBe(true);
    expect(await store.listSaved("direction")).toEqual(["report-1:0", "report-1:3"]);
    expect(await store.toggleSaved("direction", "report-1:0")).toBe(false);
    expect(await store.listSaved("direction")).toEqual(["report-1:3"]);
    expect(await store.listSaved("story")).toEqual(["report-1:0"]);
    await store.clearAll();
    expect(await store.listSaved("direction")).toEqual([]);
  });

  it("upserts experiment completions and preferences", async () => {
    const store = createLocalUserStore();
    expect(await store.getPreferences()).toEqual({ memoryConsent: false });
    await store.savePreferences({ memoryConsent: true });
    expect((await store.getPreferences()).memoryConsent).toBe(true);
    await store.saveCompletion({
      experimentId: "e1",
      rating: 4,
      enjoyedProcess: true,
      reflection: "Понравился процесс",
      completedAt: "2026-11-17T12:00:00.000Z",
    });
    await store.saveCompletion({
      experimentId: "e1",
      rating: 5,
      enjoyedProcess: true,
      reflection: "Ещё лучше",
      completedAt: "2026-11-17T13:00:00.000Z",
    });
    const list = await store.listCompletions();
    expect(list).toHaveLength(1);
    expect(list[0].rating).toBe(5);
  });
});
