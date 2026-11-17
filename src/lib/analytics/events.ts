/** The only events we count. Anonymous: no user id, no content. */
export const ANALYTICS_EVENTS = ["questionnaire_completed", "report_generated", "story_submitted"] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEvent(name: unknown): name is AnalyticsEvent {
  return typeof name === "string" && (ANALYTICS_EVENTS as readonly string[]).includes(name);
}
