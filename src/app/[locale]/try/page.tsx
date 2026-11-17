import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExperimentsExplorer } from "@/components/try/experiments-explorer";
import { PageHeader } from "@/components/ui/page-header";
import { getContent } from "@/lib/data";
import { buildExperimentRelations } from "@/lib/experiments/relations";
import { toExperimentView } from "@/lib/experiments/view";

export async function generateMetadata({ params }: PageProps<"/[locale]/try">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "try" });
  return { title: t("metaTitle"), description: t("philosophy") };
}

/** Static content on the server (experiments in this language); saved state lives in the client island. */
export default async function TryPage({ params }: PageProps<"/[locale]/try">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("try");
  const all = await getContent().listExperiments();
  const experiments = all.map((e) => toExperimentView(e, locale as "ru" | "kk" | "en"));
  // Which experiments are alike (from the direction catalogue), used to rank by the person's feedback.
  const relations = buildExperimentRelations(all);
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
        <p className="mt-8 border-l-2 border-accent pl-5 font-display text-xl font-medium leading-snug text-balance sm:text-2xl">{t("philosophy")}</p>
      </PageHeader>
      <ExperimentsExplorer experiments={experiments} relations={relations} />
    </>
  );
}
