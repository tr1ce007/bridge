import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalUserStore } from "@/lib/data/local-store";
import { resetStorageState } from "@/lib/data/storage";
import { loadWorkingRoadmap, saveWorkingRoadmap, workingRoadmap } from "@/lib/dashboard/roadmap";
import { buildFallbackReport } from "@/lib/report/fallback";
import { sampleAnswers } from "./helpers/answers";

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
  };
}

describe("saveWorkingRoadmap", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: fakeLocalStorage() });
    resetStorageState();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("saves the roadmap and mirrors it into the newest report only", async () => {
    const store = createLocalUserStore();
    const old = buildFallbackReport(sampleAnswers(), "ru", { id: "old", createdAt: "2026-11-01T00:00:00.000Z" });
    const latest = buildFallbackReport(sampleAnswers(), "ru", { id: "new", createdAt: "2026-11-10T00:00:00.000Z" });
    await store.saveReport(old);
    await store.saveReport(latest);
    const edited = { ...latest.roadmap, d7: [{ ...latest.roadmap.d7[0], done: true }, ...latest.roadmap.d7.slice(1)] };
    await saveWorkingRoadmap(store, edited);
    expect(await store.getRoadmap()).toEqual(edited);
    const reports = await store.listReports();
    expect(reports.find((r) => r.id === "new")!.roadmap).toEqual(edited);
    expect(reports.find((r) => r.id === "old")!.roadmap).toEqual(old.roadmap);
  });

  it("works when there is no report yet", async () => {
    const store = createLocalUserStore();
    const roadmap = { d7: [{ id: "x", text: "шаг", done: false }], d30: [], d90: [] };
    await saveWorkingRoadmap(store, roadmap);
    expect(await store.getRoadmap()).toEqual(roadmap);
    expect(await store.listReports()).toEqual([]);
  });
});

describe("workingRoadmap", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: fakeLocalStorage() });
    resetStorageState();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is the newest report's plan, even when an older plan is stored", async () => {
    const store = createLocalUserStore();
    const old = buildFallbackReport(sampleAnswers(), "ru", { id: "old", createdAt: "2026-11-01T00:00:00.000Z" });
    const latest = buildFallbackReport(sampleAnswers([{ questionId: "B1", value: ["health"] }]), "ru", { id: "new", createdAt: "2026-11-10T00:00:00.000Z" });
    await store.saveReport(old);
    await store.saveReport(latest);
    await store.saveRoadmap(old.roadmap); // the report page only seeds the roadmap once
    expect(await loadWorkingRoadmap(store)).toEqual(latest.roadmap);
    expect(workingRoadmap([latest, old], old.roadmap)).toEqual(latest.roadmap);
  });

  it("falls back to the stored roadmap without reports", async () => {
    const stored = { d7: [{ id: "x", text: "шаг", done: false }], d30: [], d90: [] };
    expect(workingRoadmap([], stored)).toEqual(stored);
    const store = createLocalUserStore();
    await store.saveRoadmap(stored);
    expect(await loadWorkingRoadmap(store)).toEqual(stored);
  });
});

