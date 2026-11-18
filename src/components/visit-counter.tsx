"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";
import { countOncePerDay } from "@/lib/analytics/client";

/** Counts one anonymous site visit per browser per day (for the admin analytics table). */
export function VisitCounter() {
  const locale = useLocale();
  useEffect(() => {
    countOncePerDay("site_visit", locale);
  }, [locale]);
  return null;
}
