import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OpportunityForm } from "@/components/admin/opportunity-form";
import { SectionHead } from "@/components/admin/section";
import { guardStaffPage } from "@/lib/auth/guard";

export default async function Page({ params }: PageProps<"/[locale]/admin/opportunities/new">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await guardStaffPage();
  const t = await getTranslations("admin.opportunities");
  return (
    <>
      <SectionHead title={t("form.createTitle")} lead={t("lead")} />
      <OpportunityForm />
    </>
  );
}
