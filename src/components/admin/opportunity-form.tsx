"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveOpportunityAction } from "@/lib/admin/actions";
import { IDLE } from "@/lib/admin/action-state";
import { OPPORTUNITY_COSTS, OPPORTUNITY_COUNTRIES, OPPORTUNITY_KINDS, OPPORTUNITY_LEVELS, OPPORTUNITY_STATUSES, type Opportunity } from "@/lib/data/types";
import { fieldClass, ResultNote } from "./result-note";

/** Create (no `opportunity`) or edit an opportunity. Nothing here fills in a deadline for the person. */
export function OpportunityForm({ opportunity }: { opportunity?: Opportunity }) {
  const t = useTranslations("admin.opportunities.form");
  const o = useTranslations("opportunities");
  const c = useTranslations("admin.common");
  const locale = useLocale();
  const [state, action, pending] = useActionState(saveOpportunityAction, IDLE);
  const bad = (f: string) => (state.status === "error" && state.fields?.some((x) => x === f || x.startsWith(`${f}.`))) || undefined;
  const lang = [
    ["ru", t("langRu")],
    ["kk", t("langKk")],
    ["en", t("langEn")],
  ] as const;

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      {opportunity && <input type="hidden" name="editId" value={opportunity.id} />}

      <div className="sm:col-span-2">
        <label htmlFor="f-name" className="text-sm font-medium">
          {t("name")}
        </label>
        <input id="f-name" name="name" required maxLength={200} defaultValue={opportunity?.name} aria-invalid={bad("name")} className={fieldClass} />
      </div>

      {!opportunity && (
        <div className="sm:col-span-2">
          <label htmlFor="f-id" className="text-sm font-medium">
            {t("id")}
          </label>
          <input id="f-id" name="customId" maxLength={60} pattern="[a-z0-9][a-z0-9\-]{1,59}" aria-invalid={bad("id")} className={fieldClass} />
          <p className="mt-1.5 text-sm text-muted">{t("idHelp")}</p>
        </div>
      )}

      <div>
        <label htmlFor="f-kind" className="text-sm font-medium">
          {t("kind")}
        </label>
        <select id="f-kind" name="kind" defaultValue={opportunity?.kind ?? "scholarship"} className={fieldClass}>
          {OPPORTUNITY_KINDS.map((k) => (
            <option key={k} value={k}>
              {o(`kinds.${k}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-country" className="text-sm font-medium">
          {t("country")}
        </label>
        <select id="f-country" name="country" defaultValue={opportunity?.country ?? "international"} className={fieldClass}>
          {OPPORTUNITY_COUNTRIES.map((k) => (
            <option key={k} value={k}>
              {o(`countries.${k}`)}
            </option>
          ))}
        </select>
      </div>

      <fieldset aria-invalid={bad("levels")}>
        <legend className="text-sm font-medium">{t("levels")}</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {OPPORTUNITY_LEVELS.map((l) => (
            <label key={l} className="inline-flex min-h-8 items-center gap-2 text-sm">
              <input type="checkbox" name="levels" value={l} defaultChecked={opportunity ? opportunity.levels.includes(l) : l === "any"} className="size-4" />
              {o(`levels.${l}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="f-cost" className="text-sm font-medium">
          {t("cost")}
        </label>
        <select id="f-cost" name="cost" defaultValue={opportunity?.cost ?? "unknown"} className={fieldClass}>
          {OPPORTUNITY_COSTS.map((k) => (
            <option key={k} value={k}>
              {o(`costs.${k}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="f-url" className="text-sm font-medium">
          {t("url")}
        </label>
        <input id="f-url" name="url" type="url" inputMode="url" required placeholder="https://" defaultValue={opportunity?.url} aria-invalid={bad("url")} className={fieldClass} />
        <p className="mt-1.5 text-sm text-muted">{t("urlHelp")}</p>
      </div>

      <div>
        <label htmlFor="f-deadline" className="text-sm font-medium">
          {t("deadline")}
        </label>
        <input id="f-deadline" name="deadline" type="date" defaultValue={opportunity?.deadline ?? ""} aria-invalid={bad("deadline")} className={fieldClass} />
        <p className="mt-1.5 text-sm text-muted">{t("deadlineHelp")}</p>
      </div>
      <div>
        <label htmlFor="f-source" className="text-sm font-medium">
          {t("source")}
        </label>
        <input id="f-source" name="source" maxLength={500} defaultValue={opportunity?.source ?? ""} aria-invalid={bad("source")} className={fieldClass} />
        <p className="mt-1.5 text-sm text-muted">{t("sourceHelp")}</p>
      </div>

      <div>
        <label htmlFor="f-status" className="text-sm font-medium">
          {t("status")}
        </label>
        <select id="f-status" name="status" defaultValue={opportunity?.status ?? "unverified"} className={fieldClass}>
          {OPPORTUNITY_STATUSES.map((k) => (
            <option key={k} value={k}>
              {o(`statusFilter.${k}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-verified" className="text-sm font-medium">
          {t("verifiedAt")}
        </label>
        <input id="f-verified" name="verifiedAt" type="date" defaultValue={opportunity?.verifiedAt?.slice(0, 10) ?? ""} aria-invalid={bad("verifiedAt")} className={fieldClass} />
        <p className="mt-1.5 text-sm text-muted">{t("verifiedAtHelp")}</p>
      </div>

      {(["description", "eligibility"] as const).map((field) => (
        <fieldset key={field} className="grid gap-3 sm:col-span-2" aria-invalid={bad(field)}>
          <legend className="text-sm font-medium">{t(field)}</legend>
          {lang.map(([code, label]) => (
            <div key={code}>
              <label htmlFor={`f-${field}-${code}`} className="text-xs font-semibold uppercase tracking-wide text-muted">
                {label}
              </label>
              <textarea
                id={`f-${field}-${code}`}
                name={`${field}_${code}`}
                required
                rows={3}
                maxLength={4000}
                defaultValue={opportunity?.[field][code]}
                className={`${fieldClass} py-2`}
              />
            </div>
          ))}
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? c("saving") : opportunity ? t("update") : t("create")}
        </Button>
        <Button href="/admin/opportunities" variant="ghost">
          {c("cancel")}
        </Button>
        <ResultNote state={state} ns="opportunities" />
      </div>
    </form>
  );
}
