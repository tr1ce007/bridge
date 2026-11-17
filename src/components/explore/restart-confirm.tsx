"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/** Inline confirmation before clearing the questionnaire session. Escape cancels. */
export function RestartConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const t = useTranslations("explore");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div role="alertdialog" aria-labelledby="restart-title" aria-describedby="restart-text" className="mb-6 rounded-2xl border border-accent/50 bg-subtle p-5">
      <h2 id="restart-title" className="font-display text-lg font-semibold">
        {t("restartTitle")}
      </h2>
      <p id="restart-text" className="mt-2 text-sm leading-relaxed text-muted">
        {t("restartText")}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button ref={cancelRef} variant="ghost" onClick={onCancel}>
          {t("restartCancel")}
        </Button>
        <Button onClick={onConfirm}>{t("restartConfirm")}</Button>
      </div>
    </div>
  );
}
