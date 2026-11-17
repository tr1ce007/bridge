import { describe, expect, it } from "vitest";
import { compareReports, directionKey } from "@/lib/report/compare";
import { getDirection } from "@/lib/report/directions";
import { buildFallbackReport } from "@/lib/report/fallback";
import type { DiscoveryReport } from "@/lib/data/types";
import { sampleAnswers } from "./helpers/answers";

function report(over: Partial<DiscoveryReport> & { names: string[]; patterns?: string[] }): DiscoveryReport {
  const base = buildFallbackReport(sampleAnswers(), "ru", { id: over.id ?? "r" });
  const template = base.directions[0];
  return {
    ...base,
    ...over,
    patterns: over.patterns ?? base.patterns,
    directions: over.names.map((name) => ({ ...template, name })),
  };
}

describe("compareReports", () => {
  it("splits directions into appeared, disappeared and stayed", () => {
    const a = report({ names: ["Психология", "Дизайн", "Право", "Медиа", "Инженерия"] });
    const b = report({ names: ["Психология", "Дизайн", "Медицина", "Экология", "Образование"] });
    const diff = compareReports(a, b);
    expect(diff.stayed).toEqual(["Психология", "Дизайн"]);
    expect(diff.appeared).toEqual(["Медицина", "Экология", "Образование"]);
    expect(diff.disappeared).toEqual(["Право", "Медиа", "Инженерия"]);
  });

  it("ignores case, spaces and punctuation when matching names", () => {
    const a = report({ names: ["  Data and  ML! ", "Design", "Law", "Media", "Engineering"] });
    const b = report({ names: ["data and ml", "Design.", "Law", "Media", "Engineering"] });
    const diff = compareReports(a, b);
    expect(diff.stayed).toHaveLength(5);
    expect(diff.appeared).toEqual([]);
    expect(diff.disappeared).toEqual([]);
  });

  it("recognises the same catalogue direction written in two languages", () => {
    const ids = ["psychology", "design", "law", "media", "engineering"];
    const names = (loc: "ru" | "en") => ids.map((id) => getDirection(id)!.label[loc]);
    expect(directionKey(names("ru")[0])).toBe(directionKey(names("en")[0]));
    expect(directionKey(names("ru")[0])).not.toBe(directionKey(names("ru")[2]));
    const diff = compareReports(report({ names: names("ru") }), report({ names: names("en") }));
    expect(diff.stayed).toEqual(names("en"));
    expect(diff.appeared).toEqual([]);
    expect(diff.disappeared).toEqual([]);
  });

  it("reports changed patterns separately from directions", () => {
    const a = report({ names: ["A1", "A2", "A3", "A4", "A5"], patterns: ["Тебя тянет к людям", "Тебе важна свобода"] });
    const b = report({ names: ["A1", "A2", "A3", "A4", "A5"], patterns: ["Тебе важна свобода", "Ты любишь пробовать новое"] });
    const diff = compareReports(a, b);
    expect(diff.patternsStayed).toEqual(["Тебе важна свобода"]);
    expect(diff.patternsAppeared).toEqual(["Ты любишь пробовать новое"]);
    expect(diff.patternsDisappeared).toEqual(["Тебя тянет к людям"]);
  });

  it("comparing a report with itself changes nothing", () => {
    const a = report({ names: ["A1", "A2", "A3", "A4", "A5"] });
    const diff = compareReports(a, a);
    expect(diff.appeared).toEqual([]);
    expect(diff.disappeared).toEqual([]);
    expect(diff.stayed).toHaveLength(5);
  });

  it("does not repeat a name that is listed twice", () => {
    const a = report({ names: ["X", "X", "Y", "Z", "W"] });
    const b = report({ names: ["X", "Y", "Z", "W", "V"] });
    const diff = compareReports(a, b);
    expect(diff.stayed).toEqual(["X", "Y", "Z", "W"]);
    expect(diff.appeared).toEqual(["V"]);
  });
});
