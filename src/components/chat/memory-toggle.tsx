"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/** Consent switch: off by default, explains what "remember" means before and after it is turned on. */
export function MemoryToggle({
  checked,
  onChange,
  disabled,
  issue,
  offFailed,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  issue: "blocked" | "failed" | null;
  /** Turning memory off did not fully work. Shown whatever the switch says. */
  offFailed?: boolean;
}) {
  const t = useTranslations("chat");
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <span id="memory-label" className="text-[15px] font-semibold leading-snug">
          {t("memoryLabel")}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby="memory-label"
          aria-describedby="memory-help"
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            "relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-50",
            checked ? "border-primary bg-primary" : "border-border bg-subtle",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-0.5 left-0.5 size-5.5 rounded-full bg-bg shadow transition-transform motion-reduce:transition-none",
              checked ? "translate-x-5 bg-primary-fg" : "translate-x-0 border border-border",
            )}
          />
        </button>
      </div>
      <p id="memory-help" className="mt-2 text-[13px] leading-relaxed text-muted sm:text-sm">
        {checked ? t("memoryHelpOn") : t("memoryHelpOff")}
      </p>
      {offFailed && (
        <p role="alert" className="mt-2 text-sm leading-relaxed text-red-700 dark:text-red-400">
          {t("memoryOffFailed")}
        </p>
      )}
      {checked && issue && (
        <p role="status" className="mt-2 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
          {issue === "blocked" ? t("memoryBlocked") : t("memorySaveFailed")}
        </p>
      )}
    </div>
  );
}
