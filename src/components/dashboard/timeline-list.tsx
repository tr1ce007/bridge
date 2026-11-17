"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TimelineEvent } from "@/lib/dashboard/timeline";

/** Reports, experiments and journal entries in date order, newest first. No scores. */
export function TimelineList({ events, experimentTitles }: { events: TimelineEvent[]; experimentTitles: Map<string, string> }) {
  const t = useTranslations("dashboard");
  const tTry = useTranslations("try");
  const format = useFormatter();
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {events.map((e) => (
        <li key={`${e.kind}:${e.id}`} className="relative">
          <span
            aria-hidden="true"
            className={`absolute top-1.5 -left-[1.9rem] size-3 rounded-full border-2 border-bg ${e.kind === "report" ? "bg-primary" : e.kind === "experiment" ? "bg-accent" : "bg-muted"}`}
          />
          <p className="text-xs text-muted">{date(e.date)}</p>
          {e.kind === "report" && (
            <div>
              <p className="font-semibold">
                <Link href={`/report/${encodeURIComponent(e.reportId)}`} className="hover:underline">
                  {t("timelineReport")}
                </Link>
              </p>
              {e.topDirections.length > 0 && (
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {t("timelineTop")}: {e.topDirections.join(" · ")}
                </p>
              )}
            </div>
          )}
          {e.kind === "experiment" && (
            <div>
              <p className="font-semibold">
                <Link href={`/try#${e.experimentId}`} className="hover:underline">
                  {t("timelineExperiment", { title: experimentTitles.get(e.experimentId) ?? e.experimentId })}
                </Link>
              </p>
              {e.answer && <p className="mt-1 text-sm text-muted">{tTry("resultAnswer", { answer: tTry(`answers.${e.answer}`) })}</p>}
            </div>
          )}
          {e.kind === "journal" && (
            <div>
              <p className="font-semibold">
                <Link href="/journal" className="hover:underline">
                  {t("timelineJournal")}
                </Link>
              </p>
              {e.preview && <p className="mt-1 text-sm leading-relaxed text-muted break-words">«{e.preview}»</p>}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
