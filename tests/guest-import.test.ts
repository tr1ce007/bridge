import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importGuestData, hasGuestData, type ImportSummary } from "@/lib/auth/guest-import";
import { createLocalUserStore } from "@/lib/data/local-store";
import { resetStorageState } from "@/lib/data/storage";
import { createSupabaseUserStore } from "@/lib/data/supabase-store";
import type { DiscoveryReport, QuestionnaireSession } from "@/lib/data/types";
import { buildFallbackReport } from "@/lib/report/fallback";
import { createMemorySupabase } from "./helpers/memory-supabase";

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
  };
}

const session: QuestionnaireSession = {
  id: "s1",
  answers: [
    { questionId: "a1", value: "school" },
    { questionId: "b2", value: ["tech", "people"] },
  ],
  currentId: "b3",
  startedAt: "2026-11-17T10:00:00.000Z",
  updatedAt: "2026-11-17T10:05:00.000Z",
};

function makeReport(id: string): DiscoveryReport {
  return { ...buildFallbackReport([], "ru", { stories: [] }), id };
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: fakeLocalStorage() });
  resetStorageState();
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetStorageState();
});

async function seedGuest() {
  const local = createLocalUserStore();
  await local.saveSession(session);
  await local.saveReport(makeReport("r1"));
  await local.saveJournal({ id: "j1", text: "", tried: "Позвонил в вуз", createdAt: "2026-11-17T12:00:00.000Z" });
  await local.toggleSaved("story", "demo-changed-major");
  await local.toggleSaved("opportunity", "daad");
  await local.saveCompletion({
    experimentId: "exp-programming-first",
    rating: 4,
    enjoyedProcess: true,
    answer: "process",
    reflection: "ок",
    completedAt: "2026-11-17T13:00:00.000Z",
  });
  return local;
}

describe("importGuestData", () => {
  it("copies guest data into the account", async () => {
    const local = await seedGuest();
    const { client, tables } = createMemorySupabase("user-1");
    const remote = createSupabaseUserStore(() => client, local);

    const summary = await importGuestData(local, remote);
    expect(summary).toEqual<ImportSummary>({ session: true, reports: 1, journal: 1, saved: 2, completions: 1, roadmap: false });

    expect((await remote.loadSession())?.answers).toHaveLength(2);
    expect((await remote.listReports()).map((r) => r.id)).toEqual(["r1"]);
    expect((await remote.listJournal()).map((j) => j.id)).toEqual(["j1"]);
    expect(await remote.listSaved("story")).toEqual(["demo-changed-major"]);
    expect(await remote.listSaved("opportunity")).toEqual(["daad"]);
    expect((await remote.listCompletions()).map((c) => c.experimentId)).toEqual(["exp-programming-first"]);
    expect(tables.get("discovery_reports")?.every((r) => r.user_id === "user-1")).toBe(true);
  });

  it("is idempotent: a second run does not duplicate or write anything", async () => {
    const local = await seedGuest();
    const { client, tables, writes } = createMemorySupabase("user-1");
    const remote = createSupabaseUserStore(() => client, local);

    await importGuestData(local, remote);
    const snapshot = JSON.stringify([...tables.entries()]);
    const writesAfterFirst = writes.length;

    const second = await importGuestData(local, remote);
    expect(second).toEqual<ImportSummary>({ session: false, reports: 0, journal: 0, saved: 0, completions: 0, roadmap: false });
    expect(JSON.stringify([...tables.entries()])).toBe(snapshot);
    expect(writes.length).toBe(writesAfterFirst);
    expect(tables.get("saved_stories")).toHaveLength(1);
    expect(tables.get("journal_entries")).toHaveLength(1);
    expect(tables.get("discovery_reports")).toHaveLength(1);
  });

  it("does not overwrite what the account already has", async () => {
    const local = await seedGuest();
    const { client, tables } = createMemorySupabase("user-1");
    const remote = createSupabaseUserStore(() => client, local);
    // The account already has its own questionnaire session, the same saved story and a completion.
    tables.set("questionnaire_sessions", [
      { id: "account-session", user_id: "user-1", current_id: "z", started_at: "2026-10-01T00:00:00.000Z", updated_at: "2026-10-02T00:00:00.000Z" },
    ]);
    tables.set("saved_stories", [{ user_id: "user-1", story_id: "demo-changed-major", created_at: "1" }]);
    tables.set("experiment_completions", [
      { user_id: "user-1", experiment_id: "exp-programming-first", rating: 2, enjoyed_process: false, process_answer: "idea", reflection: "аккаунт", completed_at: "2026-10-05T00:00:00.000Z" },
    ]);

    const summary = await importGuestData(local, remote);
    expect(summary.session).toBe(false);
    expect(summary.saved).toBe(1); // only the opportunity was new
    expect(summary.completions).toBe(0);
    expect((await remote.loadSession())?.id).toBe("account-session");
    expect(tables.get("saved_stories")).toHaveLength(1);
    expect((await remote.listCompletions())[0].reflection).toBe("аккаунт");
  });

  it("imports a roadmap only when the account has none", async () => {
    const local = createLocalUserStore();
    const item = { id: "t1", text: "Позвонить", done: false };
    await local.saveRoadmap({ d7: [item], d30: [], d90: [] });
    const { client, writes } = createMemorySupabase("user-1");
    const remote = createSupabaseUserStore(() => client, local);

    expect((await importGuestData(local, remote)).roadmap).toBe(true);
    expect((await remote.getRoadmap()).d7).toHaveLength(1);
    const count = writes.length;
    expect((await importGuestData(local, remote)).roadmap).toBe(false);
    expect(writes.length).toBe(count);
  });

  it("keeps the data on this device", async () => {
    const local = await seedGuest();
    const { client } = createMemorySupabase("user-1");
    const remote = createSupabaseUserStore(() => client, local);
    await importGuestData(local, remote);
    expect(await local.listSaved("story")).toEqual(["demo-changed-major"]);
    expect((await local.listReports()).map((r) => r.id)).toEqual(["r1"]);
  });

  it("an empty device imports nothing", async () => {
    const local = createLocalUserStore();
    const { client, writes } = createMemorySupabase("user-1");
    const remote = createSupabaseUserStore(() => client, local);
    expect(await importGuestData(local, remote)).toEqual<ImportSummary>({ session: false, reports: 0, journal: 0, saved: 0, completions: 0, roadmap: false });
    expect(writes).toEqual([]);
  });
});

describe("hasGuestData", () => {
  it("is false for an empty device and true once something is saved", async () => {
    const local = createLocalUserStore();
    expect(await hasGuestData(local)).toBe(false);
    await local.toggleSaved("story", "x");
    expect(await hasGuestData(local)).toBe(true);
  });

  it("ignores a questionnaire session without answers", async () => {
    const local = createLocalUserStore();
    await local.saveSession({ ...session, answers: [] });
    expect(await hasGuestData(local)).toBe(false);
  });
});
