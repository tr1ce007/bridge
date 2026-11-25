"use client";

import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/admin/action-state";

/** Success / error line under an admin form. `ns` is the `admin.<ns>` namespace holding the success texts. */
export function ResultNote({ state, ns }: { state: ActionState; ns: "stories" | "reports" | "opportunities" | "sources" | "appearance" }) {
  const t = useTranslations("admin");
  // Keys are built from the server's result codes, so the typed lookup is relaxed here.
  const text = t as unknown as (key: string) => string;
  if (state.status === "idle") return null;
  if (state.status === "ok") {
    return (
      <p role="status" className="text-sm font-medium text-green-800 dark:text-green-400">
        {state.message === "saved" ? t("common.saved") : text(`${ns}.${state.message}`)}
      </p>
    );
  }
  return (
    <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
      {text(`errors.${state.code}`)}
    </p>
  );
}

export const fieldClass = "mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-base";
