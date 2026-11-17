"use client";

import { useTranslations } from "next-intl";

/** Always shown when the report (or the AI layer) runs in demo mode. */
export function DemoBanner({ withLead = true }: { withLead?: boolean }) {
  const t = useTranslations("report");
  return (
    <div role="note" className="rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed">
      <p className="font-semibold text-amber-800 dark:text-amber-300">{t("demoBanner")}</p>
      {withLead && <p className="mt-1 text-muted">{t("demoBannerLead")}</p>}
    </div>
  );
}
