import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/dashboard/timeline";
import { buildFallbackReport } from "@/lib/report/fallback";
import type { ExperimentCompletion, JournalEntry } from "@/lib/data/types";
import { sampleAnswers } from "./helpers/answers";

const reportA = { ...buildFallbackReport(sampleAnswers(), "ru", { id: "ra", createdAt: "2026-11-01T10:00:00.000Z" }) };
const reportB = { ...buildFallbackReport(sampleAnswers(), "ru", { id: "rb", createdAt: "2026-11-10T10:00:00.000Z" }) };
const done = (id: string, completedAt: string): ExperimentCompletion => ({ experimentId: id, rating: 4, enjoyedProcess: true, reflection: "", completedAt });
const note = (id: string, createdAt: string, over: Partial<JournalEntry> = {}): JournalEntry => ({ id, text: "", createdAt, ...over });

describe("buildTimeline", () => {
  it("is empty for a first-time visitor", () => {
    expect(buildTimeline({ reports: [], completions: [], journal: [] })).toEqual([]);
  });

  it("orders reports, experiments and journal entries by date, newest first", () => {
    const events = buildTimeline({
      reports: [reportA, reportB],
      completions: [done("exp-programming-first", "2026-11-05T10:00:00.000Z")],
      journal: [note("j1", "2026-11-07T10:00:00.000Z", { learned: "Мне нравится писать код" })],
    });
    expect(events.map((e) => `${e.kind}:${e.id}`)).toEqual(["report:rb", "journal:j1", "experiment:exp-programming-first", "report:ra"]);
    expect(events.map((e) => e.date)).toEqual([
      "2026-11-10T10:00:00.000Z",
      "2026-11-07T10:00:00.000Z",
      "2026-11-05T10:00:00.000Z",
      "2026-11-01T10:00:00.000Z",
    ]);
  });

  it("shows the top 3 directions of each report", () => {
    const [event] = buildTimeline({ reports: [reportA], completions: [], journal: [] });
    expect(event.kind).toBe("report");
    if (event.kind !== "report") return;
    expect(event.topDirections).toEqual(reportA.directions.slice(0, 3).map((d) => d.name));
    expect(event.topDirections).toHaveLength(3);
  });

  it("uses the first filled field as the journal preview and cuts long text", () => {
    const long = "я ".repeat(200);
    const events = buildTimeline({
      reports: [],
      completions: [],
      journal: [note("a", "2026-11-02T00:00:00.000Z", { surprised: "  Неожиданно  " }), note("b", "2026-11-03T00:00:00.000Z", { tried: long })],
    });
    const preview = (id: string) => {
      const e = events.find((x) => x.id === id);
      return e && e.kind === "journal" ? e.preview : null;
    };
    expect(preview("a")).toBe("Неожиданно");
    expect(preview("b")!.length).toBeLessThanOrEqual(141);
    expect(preview("b")!.endsWith("…")).toBe(true);
  });

  it("keeps a stable order when dates are equal and ignores bad dates", () => {
    const same = "2026-11-05T10:00:00.000Z";
    const events = buildTimeline({
      reports: [{ ...reportA, createdAt: same }],
      completions: [done("x", same)],
      journal: [note("j", same, { tried: "t" }), note("bad", "not a date", { tried: "t" })],
    });
    expect(events.map((e) => e.kind)).toEqual(["report", "experiment", "journal"]);
  });
});
