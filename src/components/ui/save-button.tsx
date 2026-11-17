"use client";

import { cn } from "@/lib/cn";

/** Save / unsave toggle (bookmark). `ariaLabel` names the item, so screen readers hear what is saved. */
export function SaveButton({
  saved,
  disabled,
  onToggle,
  labelSave,
  labelSaved,
  ariaLabel,
  className,
}: {
  saved: boolean;
  disabled?: boolean;
  onToggle: () => void;
  labelSave: string;
  labelSaved: string;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-50",
        saved ? "border-primary/40 bg-primary/10 text-primary dark:text-[var(--ring)]" : "border-border text-fg hover:border-fg/40 hover:bg-subtle",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M6 3h12v18l-6-4.5L6 21z" />
      </svg>
      <span aria-hidden="true">{saved ? labelSaved : labelSave}</span>
    </button>
  );
}
