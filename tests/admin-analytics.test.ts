import { describe, expect, it } from "vitest";
import { aggregateEventsByDay } from "@/lib/admin/analytics";

describe("aggregateEventsByDay", () => {
  const now = new Date("2026-11-18T10:00:00Z"); // 15:00 in Asia/Almaty

  it("counts events per day and name, newest day first, with empty days included", () => {
    const rows = [
      { name: "report_generated", created_at: "2026-11-18T01:00:00Z" },
      { name: "report_generated", created_at: "2026-11-18T02:00:00Z" },
      { name: "story_submitted", created_at: "2026-11-16T05:00:00Z" },
    ];
    const r = aggregateEventsByDay(rows, { days: 3, now });
    expect(r.days.map((d) => d.day)).toEqual(["2026-11-18", "2026-11-17", "2026-11-16"]);
    expect(r.days[0].counts).toEqual({ report_generated: 2 });
    expect(r.days[1].counts).toEqual({});
    expect(r.days[2].counts).toEqual({ story_submitted: 1 });
    expect(r.totals).toEqual({ report_generated: 2, story_submitted: 1 });
  });

  it("uses the Asia/Almaty calendar day (UTC+5)", () => {
    // 20:00 UTC on the 17th is already 01:00 on the 18th in Almaty.
    const r = aggregateEventsByDay([{ name: "report_generated", created_at: "2026-11-17T20:00:00Z" }], { days: 2, now });
    expect(r.days[0].day).toBe("2026-11-18");
    expect(r.days[0].counts).toEqual({ report_generated: 1 });
  });

  it("ignores events older than the window and rows with unreadable dates", () => {
    const r = aggregateEventsByDay(
      [
        { name: "report_generated", created_at: "2026-10-01T00:00:00Z" },
        { name: "report_generated", created_at: "not a date" },
      ],
      { days: 30, now },
    );
    expect(r.totals).toEqual({});
    expect(r.days).toHaveLength(30);
  });
});
