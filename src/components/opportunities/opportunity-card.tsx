"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { SaveButton } from "@/components/ui/save-button";
import type { Locale, Opportunity, OpportunityStatus } from "@/lib/data";
import { localized } from "@/lib/localized";

const STATUS_TONE = { verified: "accent", unverified: "neutral", outdated: "warning" } as const;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Opportunity card. `status` is computed by the parent at render time (180-day rule). */
export function OpportunityCard({
  opportunity: o,
  status,
  saved,
  saveDisabled,
  onToggleSave,
}: {
  opportunity: Opportunity;
  status: OpportunityStatus;
  saved: boolean;
  saveDisabled: boolean;
  onToggleSave: () => void;
}) {
  const t = useTranslations("opportunities");
  const format = useFormatter();
  const locale = useLocale() as Locale;
  const date = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : format.dateTime(d, { dateStyle: "long", timeZone: "UTC" });
  };
  const levels = o.levels.map((l) => t(`levels.${l}`)).join(", ");
  const statusText =
    status === "verified" && o.verifiedAt
      ? t("statusVerified", { date: date(o.verifiedAt) })
      : status === "outdated"
        ? t("statusOutdated")
        : t("statusUnverified");

  return (
    <li className="flex flex-col rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{t(`kinds.${o.kind}`)}</Badge>
        <Badge tone={STATUS_TONE[status]}>{statusText}</Badge>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold leading-snug tracking-tight text-balance">{o.name}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{localized(o.description, locale)}</p>

      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("eligibility")}</dt>
          <dd className="mt-0.5 leading-relaxed">{localized(o.eligibility, locale)}</dd>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("country")}</dt>
            <dd className="mt-0.5">{t(`countries.${o.country}`)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("levelsLabel")}</dt>
            <dd className="mt-0.5">{levels}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("cost")}</dt>
            <dd className="mt-0.5">{o.cost === "unknown" ? t("costsShort.unknown") : t(`costs.${o.cost}`)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("deadline")}</dt>
            <dd className="mt-0.5">{o.deadline ? date(o.deadline) : t("deadlineUnknown")}</dd>
          </div>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("source")}</dt>
          <dd className="mt-0.5">{t("sourceValue", { host: hostOf(o.url) })}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("lastCheck")}</dt>
          <dd className="mt-0.5">{o.verifiedAt ? date(o.verifiedAt) : t("neverChecked")}</dd>
        </div>
      </dl>

      {status === "outdated" && <p className="mt-4 rounded-xl bg-subtle px-3 py-2 text-sm leading-relaxed">{t("outdatedHint")}</p>}
      {status === "unverified" && <p className="mt-4 rounded-xl bg-subtle px-3 py-2 text-sm leading-relaxed">{t("unverifiedHint")}</p>}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <a
          href={o.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("openSiteAria", { name: o.name })}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline dark:text-[var(--ring)]"
        >
          {t("openSite")} <span aria-hidden="true">↗</span>
        </a>
        <SaveButton
          saved={saved}
          disabled={saveDisabled}
          onToggle={onToggleSave}
          labelSave={t("save")}
          labelSaved={t("saved")}
          ariaLabel={saved ? t("unsaveAria", { name: o.name }) : t("saveAria", { name: o.name })}
        />
      </div>
    </li>
  );
}
