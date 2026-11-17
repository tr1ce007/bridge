import { describe, expect, it } from "vitest";
import { DIRECTION_CATALOGUE } from "@/lib/report/directions";
import { buildFallbackReport } from "@/lib/report/fallback";
import { buildDirectionOptions } from "@/lib/whatif/options";
import { sampleAnswers } from "./helpers/answers";

const newest = buildFallbackReport(sampleAnswers(), "ru", { id: "rn", createdAt: "2026-11-10T00:00:00.000Z" });
const oldest = buildFallbackReport(sampleAnswers([{ questionId: "B1", value: ["health", "science"] }]), "ru", { id: "ro", createdAt: "2026-11-01T00:00:00.000Z" });

describe("buildDirectionOptions", () => {
  it("lists the directions of the reports, newest report first, without repeats", () => {
    const options = buildDirectionOptions([newest, oldest], "ru");
    expect(options.every((o) => o.source === "report")).toBe(true);
    expect(options.slice(0, newest.directions.length).map((o) => o.name)).toEqual(newest.directions.map((d) => d.name));
    const keys = options.map((o) => o.name.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ids match the saved-direction ids (<report id>:<index>) and carry the report's own details", () => {
    const [first] = buildDirectionOptions([newest], "ru");
    expect(first.id).toBe("rn:0");
    expect(first.howToTest).toEqual(newest.directions[0].howToTest);
    expect(first.why).toBe(newest.directions[0].why);
  });

  it("finds the catalogue id of a direction from the report", () => {
    const [first] = buildDirectionOptions([newest], "ru");
    expect(DIRECTION_CATALOGUE.some((d) => d.id === first.key)).toBe(true);
  });

  it("falls back to the whole catalogue when there are no reports", () => {
    const options = buildDirectionOptions([], "en");
    expect(options).toHaveLength(DIRECTION_CATALOGUE.length);
    expect(options.every((o) => o.source === "catalogue")).toBe(true);
    expect(options[0]).toMatchObject({ id: DIRECTION_CATALOGUE[0].id, key: DIRECTION_CATALOGUE[0].id, name: DIRECTION_CATALOGUE[0].label.en });
  });

  it("cuts report texts to the limits of POST /api/ai/what-if so a real direction never gets a 400", async () => {
    const long = "я".repeat(1200);
    const big = {
      ...newest,
      directions: newest.directions.map((d, i) =>
        i === 0
          ? { ...d, name: "н".repeat(300), why: long, howToTest: Array(12).fill(long), skills: Array(12).fill(long), difficulties: Array(12).fill(long) }
          : d,
      ),
    };
    const [first] = buildDirectionOptions([big], "ru");
    expect(first.name.length).toBeLessThanOrEqual(160);
    expect(first.why!.length).toBeLessThanOrEqual(800);
    for (const list of [first.howToTest!, first.skills!, first.difficulties!]) {
      expect(list.length).toBeLessThanOrEqual(8);
      expect(list.every((x) => x.length <= 400)).toBe(true);
    }
    // the same checks the route does
    const { POST } = await import("@/app/api/ai/what-if/route");
    const res = await POST(
      new Request("http://localhost/api/ai/what-if", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.55.0.1" },
        body: JSON.stringify({ locale: "ru", direction: { key: first.key, name: first.name, why: first.why, howToTest: first.howToTest, skills: first.skills, difficulties: first.difficulties } }),
      }),
    );
    expect(res.status).toBe(200);
  });
});
