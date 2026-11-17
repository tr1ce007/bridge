import { describe, expect, it } from "vitest";
import { directionSavedId, parseDirectionId, resolveSavedDirections } from "@/lib/dashboard/saved-directions";
import { buildFallbackReport } from "@/lib/report/fallback";
import { sampleAnswers } from "./helpers/answers";

const r1 = buildFallbackReport(sampleAnswers(), "ru", { id: "report-a1", createdAt: "2026-11-01T00:00:00.000Z" });
const r2 = buildFallbackReport(sampleAnswers(), "ru", { id: "report-b2", createdAt: "2026-11-10T00:00:00.000Z" });

describe("saved directions", () => {
  it("builds and parses '<report id>:<index>'", () => {
    expect(directionSavedId("report-a1", 3)).toBe("report-a1:3");
    expect(parseDirectionId("report-a1:3")).toEqual({ reportId: "report-a1", index: 3 });
    expect(parseDirectionId("no-colon")).toBeNull();
    expect(parseDirectionId("r:x")).toBeNull();
    expect(parseDirectionId("r:-1")).toBeNull();
  });

  it("resolves ids to the direction in its report, in the order saved", () => {
    const out = resolveSavedDirections(["report-b2:1", "report-a1:0"], [r2, r1]);
    expect(out.map((d) => d.id)).toEqual(["report-b2:1", "report-a1:0"]);
    expect(out[0]).toMatchObject({ reportId: "report-b2", index: 1, name: r2.directions[1].name, reportDate: r2.createdAt });
  });

  it("skips ids whose report or direction no longer exists", () => {
    const out = resolveSavedDirections(["gone:0", "report-a1:99", "report-a1:2"], [r1]);
    expect(out.map((d) => d.id)).toEqual(["report-a1:2"]);
  });
});
