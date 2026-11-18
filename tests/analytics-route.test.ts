import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const trackEvent = vi.fn(async () => true);
vi.mock("@/lib/analytics/track", () => ({ trackEvent }));

const { POST } = await import("@/app/api/analytics/route");

const post = (body: unknown) =>
  new Request("http://localhost/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 200)}` },
    body: JSON.stringify(body),
  });

describe("POST /api/analytics", () => {
  it("counts a visit and a questionnaire start", async () => {
    expect((await POST(post({ name: "site_visit", locale: "ru" }))).status).toBe(204);
    expect(trackEvent).toHaveBeenLastCalledWith("site_visit", "ru");
    expect((await POST(post({ name: "questionnaire_started", locale: "xx" }))).status).toBe(204);
    expect(trackEvent).toHaveBeenLastCalledWith("questionnaire_started", undefined);
  });

  it("refuses events the browser may not report", async () => {
    trackEvent.mockClear();
    expect((await POST(post({ name: "report_generated" }))).status).toBe(400);
    expect((await POST(post({ name: "anything" }))).status).toBe(400);
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
