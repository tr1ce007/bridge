/** The only events we count. Anonymous: no user id, no content. */
export const ANALYTICS_EVENTS = [
  "site_visit",
  "questionnaire_started",
  "questionnaire_completed",
  "report_generated",
  "story_submitted",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Events the browser may report through POST /api/analytics (the rest are counted on the server). */
export const CLIENT_EVENTS = ["site_visit", "questionnaire_started"] as const;
export type ClientEvent = (typeof CLIENT_EVENTS)[number];

export function isAnalyticsEvent(name: unknown): name is AnalyticsEvent {
  return typeof name === "string" && (ANALYTICS_EVENTS as readonly string[]).includes(name);
}

export function isClientEvent(name: unknown): name is ClientEvent {
  return typeof name === "string" && (CLIENT_EVENTS as readonly string[]).includes(name);
}
