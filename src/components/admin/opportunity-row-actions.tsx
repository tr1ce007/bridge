"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Link } from "@/i18n/navigation";
import { deleteOpportunityAction, markOpportunityVerifiedAction } from "@/lib/admin/actions";
import { IDLE } from "@/lib/admin/action-state";
import { ResultNote } from "./result-note";

const small = "inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-subtle disabled:opacity-50";

/** Edit, «Отметить проверенным сегодня» and delete (with a confirmation) for one opportunity. */
export function OpportunityRowActions({ id, name }: { id: string; name: string }) {
  const t = useTranslations("admin.opportunities");
  const c = useTranslations("admin.common");
  const [verifyState, verify, verifying] = useActionState(markOpportunityVerifiedAction, IDLE);
  const [deleteState, remove, deleting] = useActionState(deleteOpportunityAction, IDLE);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/admin/opportunities/${id}`} className={small}>
        {t("edit")}
      </Link>
      <form action={verify}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={verifying} className={small}>
          {t("markVerified")}
        </button>
      </form>
      <button type="button" className={small} onClick={() => setConfirm(true)}>
        {t("delete")}
      </button>
      <ResultNote state={verifyState} ns="opportunities" />
      <ResultNote state={deleteState} ns="opportunities" />
      <ConfirmDialog
        open={confirm}
        title={t("deleteTitle", { name })}
        description={t("deleteText")}
        confirmLabel={deleting ? c("deleting") : t("deleteConfirm")}
        cancelLabel={c("cancel")}
        busy={deleting}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("id", id);
          // Calling the action from a transition keeps `pending` and the result in sync.
          startTransition(() => remove(fd));
          setConfirm(false);
        }}
      />
    </div>
  );
}
