"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { moderateStoryAction } from "@/lib/admin/actions";
import { IDLE } from "@/lib/admin/action-state";
import { STAFF_STORY_KINDS } from "@/lib/admin/schemas";
import { pickText } from "@/lib/data/content-utils";
import type { Story } from "@/lib/data/types";
import { fieldClass, ResultNote } from "./result-note";

const SECTIONS = [
  ["intro", "intro"],
  ["before", "sectionBefore"],
  ["challenges", "sectionChallenges"],
  ["actions", "sectionActions"],
  ["turningPoint", "sectionTurningPoint"],
  ["now", "sectionNow"],
  ["advice", "sectionAdvice"],
] as const;

/** One pending story: full text, and the approve / reject form. */
export function ModerationCard({ story, createdAt, consentAt }: { story: Story; createdAt: string; consentAt: string | null }) {
  const t = useTranslations("admin.stories");
  const st = useTranslations("stories");
  const kinds = useTranslations("storyKind");
  const locale = useLocale();
  const [state, action, pending] = useActionState(moderateStoryAction, IDLE);
  const fmt = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Almaty" }).format(new Date(iso));
  const err = (f: string) => state.status === "error" && state.fields?.includes(f);
  const title = pickText(story.title, locale as "ru", story.lang);

  return (
    <article className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t("language", { lang: story.lang.toUpperCase() })}</Badge>
          {!consentAt && <Badge tone="warning">{t("consentMissing")}</Badge>}
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted">
          {story.sourceName ? t("by", { name: story.sourceName }) : t("anonymous")} · {t("submittedAt", { date: fmt(createdAt) })}
          {consentAt ? ` · ${t("consentAt", { date: fmt(consentAt) })}` : ""}
        </p>
      </header>

      <details className="mt-4 rounded-2xl border border-border bg-bg p-4">
        <summary className="cursor-pointer text-sm font-semibold">{t("readFull")}</summary>
        <div className="mt-4 space-y-5">
          {SECTIONS.map(([key, label]) => {
            const body = pickText(story[key], locale as "ru", story.lang);
            if (!body) return null;
            return (
              <section key={key}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{key === "intro" ? t("intro") : st(label)}</h3>
                <p className="mt-1.5 whitespace-pre-line text-[0.95rem] leading-relaxed">{body}</p>
              </section>
            );
          })}
        </div>
      </details>

      <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={story.id} />
        <div>
          <label htmlFor={`kind-${story.id}`} className="text-sm font-medium">
            {t("kind")}
          </label>
          <select id={`kind-${story.id}`} name="kind" defaultValue="user" className={fieldClass}>
            {STAFF_STORY_KINDS.map((k) => (
              <option key={k} value={k}>
                {kinds(k)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-sm text-muted">{t("kindHelp")}</p>
        </div>
        <div>
          <label htmlFor={`url-${story.id}`} className="text-sm font-medium">
            {t("sourceUrl")}
          </label>
          <input
            id={`url-${story.id}`}
            name="sourceUrl"
            type="url"
            inputMode="url"
            placeholder="https://"
            aria-invalid={err("sourceUrl") || undefined}
            className={fieldClass}
          />
          <label htmlFor={`sname-${story.id}`} className="mt-3 block text-sm font-medium">
            {t("sourceName")}
          </label>
          <input id={`sname-${story.id}`} name="sourceName" maxLength={200} className={fieldClass} />
          <p className="mt-1.5 text-sm text-muted">{t("sourceNameHelp")}</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`note-${story.id}`} className="text-sm font-medium">
            {t("note")}
          </label>
          <textarea id={`note-${story.id}`} name="note" rows={2} maxLength={1000} className={`${fieldClass} py-2`} />
          <p className="mt-1.5 text-sm text-muted">{t("noteHelp")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            name="decision"
            value="approve"
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
          >
            {t("approve")}
          </button>
          <button
            type="submit"
            name="decision"
            value="reject"
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-full border border-border px-6 text-sm font-semibold hover:bg-subtle disabled:opacity-50"
          >
            {t("reject")}
          </button>
          <ResultNote state={state} ns="stories" />
        </div>
      </form>
    </article>
  );
}
