import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Empty, SectionHead } from "@/components/admin/section";
import { AddSourceForm, RemoveSourceButton } from "@/components/admin/source-forms";
import { Badge } from "@/components/ui/badge";
import { listStorySources } from "@/lib/admin/queries";
import { STORY_SOURCE_KINDS } from "@/lib/admin/schemas";
import { guardStaffPage } from "@/lib/auth/guard";
import { isHttpUrl } from "@/lib/data/http-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({ params }: PageProps<"/[locale]/admin/sources">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await guardStaffPage();
  const t = await getTranslations("admin.sources");
  const sources = await listStorySources(await createSupabaseServerClient());
  const kinds = (k: string) => ((STORY_SOURCE_KINDS as readonly string[]).includes(k) ? t(`kinds.${k as (typeof STORY_SOURCE_KINDS)[number]}`) : k);

  return (
    <>
      <SectionHead title={t("title")} lead={t("lead")} />
      <section aria-labelledby="add-source" className="mb-8 max-w-3xl rounded-3xl border border-border bg-card shadow-card p-5 sm:p-6">
        <h3 id="add-source" className="mb-4 font-display text-lg font-semibold tracking-tight">
          {t("add")}
        </h3>
        <AddSourceForm />
      </section>
      {sources.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <ul className="grid gap-3">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-border bg-card shadow-card p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-semibold">{s.name ?? s.url}</h3>
                  <Badge>{kinds(s.kind)}</Badge>
                </div>
                {/* Only http(s) addresses become links (the database enforces it as well). */}
                {isHttpUrl(s.url) ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-sm text-muted underline-offset-4 hover:underline">
                    {s.url}
                  </a>
                ) : (
                  <p className="mt-1 break-all text-sm text-muted">{s.url}</p>
                )}
                {s.note && <p className="mt-2 whitespace-pre-line text-sm">{s.note}</p>}
              </div>
              <RemoveSourceButton id={s.id} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
