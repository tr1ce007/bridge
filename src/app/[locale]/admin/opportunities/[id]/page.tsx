import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OpportunityForm } from "@/components/admin/opportunity-form";
import { SectionHead } from "@/components/admin/section";
import { getAdminOpportunity } from "@/lib/admin/queries";
import { guardStaffPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({ params }: PageProps<"/[locale]/admin/opportunities/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  await guardStaffPage();
  const t = await getTranslations("admin.opportunities");
  const opportunity = await getAdminOpportunity(await createSupabaseServerClient(), decodeURIComponent(id));
  if (!opportunity) notFound();
  return (
    <>
      <SectionHead title={t("form.editTitle")} lead={opportunity.name} />
      <OpportunityForm opportunity={opportunity} />
    </>
  );
}
