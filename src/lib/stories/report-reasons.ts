/** Reasons offered in the "Report this story" form (messages `stories.reportReasons.*`). */
export const REPORT_REASONS = ["inaccurate", "offensive", "personal", "spam", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
