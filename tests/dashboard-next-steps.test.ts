import { describe, expect, it } from "vitest";
import { nextSteps, type NextStepsState } from "@/lib/dashboard/next-steps";

const base: NextStepsState = {
  questionnaire: "not-started",
  canGenerate: false,
  reportCount: 0,
  openRoadmapItems: [],
  completedExperimentCount: 0,
  suggestedExperiments: [],
};

const item = (n: number, horizon: "d7" | "d30" | "d90" = "d7") => ({ id: `i${n}`, text: `Шаг ${n}`, horizon });
const exps = [
  { id: "e1", title: "Первый" },
  { id: "e2", title: "Второй" },
  { id: "e3", title: "Третий" },
];

describe("nextSteps", () => {
  it("starts the questionnaire when nothing was done", () => {
    expect(nextSteps(base)).toEqual([{ kind: "start-questionnaire" }]);
  });

  it("continues an unfinished questionnaire", () => {
    expect(nextSteps({ ...base, questionnaire: "in-progress" })).toEqual([{ kind: "continue-questionnaire" }]);
  });

  it("offers the report as soon as the required blocks are answered", () => {
    expect(nextSteps({ ...base, questionnaire: "in-progress", canGenerate: true })).toEqual([{ kind: "generate-report" }]);
    expect(nextSteps({ ...base, questionnaire: "done", canGenerate: true })).toEqual([{ kind: "generate-report" }]);
  });

  it("with a report, lists the next 3 roadmap items that are not done, in order", () => {
    const steps = nextSteps({ ...base, reportCount: 1, openRoadmapItems: [item(1), item(2, "d30"), item(3, "d30"), item(4, "d90")], completedExperimentCount: 1 });
    expect(steps).toEqual([
      { kind: "roadmap-item", id: "i1", text: "Шаг 1", horizon: "d7" },
      { kind: "roadmap-item", id: "i2", text: "Шаг 2", horizon: "d30" },
      { kind: "roadmap-item", id: "i3", text: "Шаг 3", horizon: "d30" },
    ]);
  });

  it("suggests the top-ranked experiments when none was completed", () => {
    const steps = nextSteps({ ...base, reportCount: 1, openRoadmapItems: [item(1)], suggestedExperiments: exps });
    expect(steps.map((s) => s.kind)).toEqual(["roadmap-item", "try-experiment", "try-experiment"]);
    expect(steps[1]).toEqual({ kind: "try-experiment", id: "e1", title: "Первый" });
  });

  it("does not suggest experiments once one is completed", () => {
    const steps = nextSteps({ ...base, reportCount: 2, openRoadmapItems: [item(1)], completedExperimentCount: 1, suggestedExperiments: exps });
    expect(steps.map((s) => s.kind)).toEqual(["roadmap-item"]);
  });

  it("a finished plan with experiments done gently suggests reflecting", () => {
    expect(nextSteps({ ...base, reportCount: 1, completedExperimentCount: 2 })).toEqual([{ kind: "reflect" }]);
  });

  it("works with a report and no saved session", () => {
    const steps = nextSteps({ ...base, questionnaire: "not-started", reportCount: 1, openRoadmapItems: [item(1)], completedExperimentCount: 1 });
    expect(steps[0].kind).toBe("roadmap-item");
  });
});
