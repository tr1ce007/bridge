"use client";

import { useTranslations } from "next-intl";

/** Thin, soft progress line (not a score). `value` is 0-1. */
export function ProgressBar({ value }: { value: number }) {
  const t = useTranslations("explore");
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={t("progressLabel")}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-1.5 w-full overflow-hidden rounded-full bg-primary-soft"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
