"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { rejectUnreadableStoryAction } from "@/lib/admin/actions";
import { IDLE } from "@/lib/admin/action-state";
import { ResultNote } from "./result-note";

/** A pending story that cannot be shown (its content does not match the story format): it can only be rejected. */
export function UnreadableStoryRow({ id }: { id: string }) {
  const t = useTranslations("admin.stories");
  const [state, action, pending] = useActionState(rejectUnreadableStoryAction, IDLE);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <input type="hidden" name="id" value={id} />
      <p className="min-w-0 flex-1 break-all text-sm">{t("unreadableItem", { id })}</p>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-subtle disabled:opacity-50"
      >
        {t("reject")}
      </button>
      <ResultNote state={state} ns="stories" />
    </form>
  );
}
