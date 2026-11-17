"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { resolveReportAction } from "@/lib/admin/actions";
import { IDLE } from "@/lib/admin/action-state";
import { ResultNote } from "./result-note";

export function ReportActions({ id }: { id: string }) {
  const t = useTranslations("admin.reports");
  const [state, action, pending] = useActionState(resolveReportAction, IDLE);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        name="resolution"
        value="resolved"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
      >
        {t("resolve")}
      </button>
      <button
        type="submit"
        name="resolution"
        value="dismissed"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-subtle disabled:opacity-50"
      >
        {t("dismiss")}
      </button>
      <ResultNote state={state} ns="reports" />
    </form>
  );
}
