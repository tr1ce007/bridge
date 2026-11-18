import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildExportPayload, collectExport, collectExportData, exportFileName, EXPORT_VERSION } from "@/lib/data/export";
import { createLocalUserStore } from "@/lib/data/local-store";
import { resetStorageState } from "@/lib/data/storage";
import { buildFallbackReport } from "@/lib/report/fallback";
import { markStarted } from "@/lib/experiments/progress";
import { saveMentorInterest } from "@/lib/mentors/interest";
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
    _data: data,
  };
}

describe("export payload", () => {
  let ls: ReturnType<typeof fakeLocalStorage>;
  beforeEach(() => {
    ls = fakeLocalStorage();
    vi.stubGlobal("window", { localStorage: ls });
    resetStorageState();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("includes everything in the user store plus device-only data", async () => {
    const store = createLocalUserStore();
    const report = buildFallbackReport(sampleAnswers(), "ru", { id: "r1" });
    await store.saveSession({ id: "s", answers: sampleAnswers(), currentId: null, startedAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:10:00.000Z" });
    await store.saveReport(report);
    await store.saveRoadmap(report.roadmap);
    await store.saveJournal({ id: "j1", text: "", tried: "Попробовал", createdAt: "2026-11-02T00:00:00.000Z" });
    await store.toggleSaved("story", "demo-at-27");
    await store.toggleSaved("opportunity", "bolashak");
    await store.toggleSaved("direction", "r1:0");
    await store.saveCompletion({ experimentId: "exp-programming-first", rating: 4, enjoyedProcess: true, reflection: "ok", completedAt: "2026-11-03T00:00:00.000Z" });
    await store.savePreferences({ memoryConsent: true });
    await store.saveConversation({
      id: "c1",
      messages: [{ id: "m1", role: "user", content: "Привет", createdAt: "2026-11-04T00:00:00.000Z" }],
      createdAt: "2026-11-04T00:00:00.000Z",
      updatedAt: "2026-11-04T00:00:00.000Z",
    });
    markStarted("exp-design-redo");
    saveMentorInterest({ role: "mentee", topics: ["study-abroad"], field: "", experience: "", note: "", contact: "" });
    ls.setItem("the-bridge-theme", "dark"); // not personal data of the store

    const data = await collectExportData(store);
    const payload = buildExportPayload(data, { exportedAt: new Date("2026-11-18T10:00:00Z"), storage: "local" });

    expect(payload.app).toBe("the-bridge");
    expect(payload.version).toBe(EXPORT_VERSION);
    expect(payload.exportedAt).toBe("2026-11-18T10:00:00.000Z");
    expect(payload.storage).toBe("local");
    expect(Object.keys(payload.data).sort()).toEqual(
      ["completions", "conversation", "journal", "mentorInterest", "preferences", "reports", "roadmap", "saved", "session", "startedExperiments"].sort(),
    );
    expect(payload.data.session?.answers).toHaveLength(sampleAnswers().length);
    expect(payload.data.reports.map((r) => r.id)).toEqual(["r1"]);
    expect(payload.data.roadmap.d7.length).toBeGreaterThan(0);
    expect(payload.data.journal[0].tried).toBe("Попробовал");
    expect(payload.data.saved).toEqual({ story: ["demo-at-27"], opportunity: ["bolashak"], direction: ["r1:0"] });
    expect(payload.data.completions).toHaveLength(1);
    expect(payload.data.preferences).toEqual({ memoryConsent: true });
    expect(payload.data.conversation?.messages[0].content).toBe("Привет");
    expect(payload.data.startedExperiments).toEqual(["exp-design-redo"]);
    expect(payload.data.mentorInterest?.role).toBe("mentee");
    // must survive a JSON round trip
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
  });

  it("is complete but empty for a person with no data", async () => {
    const data = await collectExportData(createLocalUserStore());
    const payload = buildExportPayload(data, { exportedAt: new Date("2026-11-18T10:00:00Z"), storage: "memory" });
    expect(payload.data.session).toBeNull();
    expect(payload.data.reports).toEqual([]);
    expect(payload.data.roadmap).toEqual({ d7: [], d30: [], d90: [] });
    expect(payload.data.conversation).toBeNull();
    expect(payload.data.mentorInterest).toBeNull();
    expect(payload.data.saved).toEqual({ story: [], opportunity: [], direction: [] });
  });

  it("names the file with the date", () => {
    expect(exportFileName(new Date(2026, 10, 18, 23, 30))).toBe("the-bridge-data-2026-11-18.json"); // local date, whatever the time zone
    expect(exportFileName(new Date(2026, 0, 5, 0, 5))).toBe("the-bridge-data-2026-01-05.json");
  });

  it("counts the parts that could not be read, so the screen can warn that the file may be incomplete", async () => {
    const store = createLocalUserStore();
    const broken = {
      ...store,
      listReports: async () => {
        throw new Error("boom");
      },
      listJournal: async () => {
        throw new Error("boom");
      },
    };
    const healthy = await collectExport(store);
    expect(healthy.failed).toBe(0);
    const result = await collectExport(broken);
    expect(result.failed).toBe(2);
    expect(result.data.reports).toEqual([]);
    expect(result.data.journal).toEqual([]);
    // the old name still returns just the data
    expect((await collectExportData(broken)).reports).toEqual([]);
  });
});
