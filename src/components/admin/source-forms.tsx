"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { addStorySourceAction, removeStorySourceAction } from "@/lib/admin/actions";
import { IDLE } from "@/lib/admin/action-state";
import { STORY_SOURCE_KINDS } from "@/lib/admin/schemas";
import { fieldClass, ResultNote } from "./result-note";

export function AddSourceForm() {
  const t = useTranslations("admin.sources");
  const c = useTranslations("admin.common");
  const [state, action, pending] = useActionState(addStorySourceAction, IDLE);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "ok") form.current?.reset();
  }, [state]);
  const bad = (f: string) => (state.status === "error" && state.fields?.includes(f)) || undefined;

  return (
    <form ref={form} action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="s-url" className="text-sm font-medium">
          {t("url")}
        </label>
        <input id="s-url" name="url" type="url" inputMode="url" required placeholder="https://" aria-invalid={bad("url")} className={fieldClass} />
      </div>
      <div>
        <label htmlFor="s-name" className="text-sm font-medium">
          {t("name")}
        </label>
        <input id="s-name" name="name" required maxLength={120} aria-invalid={bad("name")} className={fieldClass} />
      </div>
      <div>
        <label htmlFor="s-kind" className="text-sm font-medium">
          {t("kind")}
        </label>
        <select id="s-kind" name="kind" defaultValue="rss" className={fieldClass}>
          {STORY_SOURCE_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`kinds.${k}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="s-note" className="text-sm font-medium">
          {t("note")}
        </label>
        <textarea id="s-note" name="note" rows={2} maxLength={500} className={`${fieldClass} py-2`} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? c("adding") : t("add")}
        </Button>
        <ResultNote state={state} ns="sources" />
      </div>
    </form>
  );
}

export function RemoveSourceButton({ id }: { id: string }) {
  const t = useTranslations("admin.sources");
  const [state, action, pending] = useActionState(removeStorySourceAction, IDLE);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-subtle disabled:opacity-50">
        {t("remove")}
      </button>
      <ResultNote state={state} ns="sources" />
    </form>
  );
}
