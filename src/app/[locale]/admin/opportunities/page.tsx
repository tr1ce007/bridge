import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OpportunityRowActions } from "@/components/admin/opportunity-row-actions";
import { Empty, SectionHead } from "@/components/admin/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAdminOpportunities } from "@/lib/admin/queries";
import { guardStaffPage } from "@/lib/auth/guard";
import { opportunityStatus } from "@/lib/opportunities/filter";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({ params }: PageProps<"/[locale]/admin/opportunities">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await guardStaffPage();
  const t = await getTranslations("admin.opportunities");
  const o = await getTranslations("opportunities");
  const { items, unreadable } = await listAdminOpportunities(await createSupabaseServerClient());
  const now = new Date();
  const tone = { verified: "primary", unverified: "warning", outdated: "warning" } as const;

  return (
    <>
      <SectionHead title={t("title")} lead={t("lead")}>
        <Button href="/admin/opportunities/new" className="mt-4">
          {t("add")}
        </Button>
      </SectionHead>
      {unreadable > 0 && (
        <p role="note" className="mb-4 rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm">
          {t("unreadable", { count: unreadable })}
        </p>
      )}
      {items.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <ul className="grid gap-3">
          {items.map((op) => {
            const status = opportunityStatus(op, now);
            return (
              <li key={op.id} className="rounded-3xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold tracking-tight">{op.name}</h3>
                    <p className="mt-1 break-all text-sm text-muted">
                      <a href={op.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                        {op.url}
                      </a>
                    </p>
                  </div>
                  <Badge tone={tone[status]}>{o(`statusFilter.${status}`)}</Badge>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="inline text-muted">{t("columns.kind")}: </dt>
                    <dd className="inline">{o(`kinds.${op.kind}`)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">{t("columns.verified")}: </dt>
                    <dd className="inline">{op.verifiedAt ? op.verifiedAt.slice(0, 10) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">{t("columns.deadline")}: </dt>
                    <dd className="inline">{op.deadline ? op.deadline.slice(0, 10) : "—"}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <OpportunityRowActions id={op.id} name={op.name} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
