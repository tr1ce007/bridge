"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

/**
 * Modal confirmation on the native <dialog> element (focus stays inside, Escape closes it).
 * `onCancel` runs for the cancel button, Escape and a click on the backdrop.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmDisabled,
  busy,
  danger = true,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
  busy?: boolean;
  danger?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby={description ? "confirm-desc" : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-border bg-bg p-0 text-fg shadow-xl backdrop:bg-black/50"
    >
      {open && (
        <div className="p-6 sm:p-7">
          <h2 id="confirm-title" className="font-display text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p id="confirm-desc" className="mt-3 text-[0.95rem] leading-relaxed text-muted">
              {description}
            </p>
          )}
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled || busy}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
                danger ? "bg-red-700 text-white hover:bg-red-800" : "bg-primary text-primary-fg hover:bg-primary-hover",
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
