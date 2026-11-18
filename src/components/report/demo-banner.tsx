"use client";

import { useTranslations } from "next-intl";

/**
 * Always shown for a rule-based report. `reason = "failed"` means AI is configured but the call
 * failed (different copy); otherwise AI is not connected at all.
 */
export function DemoBanner({ reason, withLead = true }: { reason?: "not-configured" | "failed"; withLead?: boolean }) {
  const t = useTranslations("report");
  const failed = reason === "failed";
  return (
    <div role="note" className="rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm leading-relaxed">
      <p className="font-semibold text-accent-text">{failed ? t("demoBannerFailed") : t("demoBanner")}</p>
      {withLead && <p className="mt-1 text-muted">{failed ? t("demoBannerFailedLead") : t("demoBannerLead")}</p>}
    </div>
  );
}
