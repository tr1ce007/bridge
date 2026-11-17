import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { SetupGuide } from "@/components/admin/setup-guide";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { redirect } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Per-visitor (session cookies, roles): never prerendered or cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "admin" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/**
 * Shell of the admin area. This is only the first gate: every page and every action calls
 * `requireRole` itself (layouts do not re-run on client navigation, and actions are plain POSTs).
 */
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("admin");

  if (!isSupabaseConfigured()) return <SetupGuide />;

  const user = await getSessionUser();
  if (!user) redirect({ href: "/auth", locale: locale as Locale });
  if (!user || user.role === "user") {
    return (
      <PageHeader title={t("gate.noAccessTitle")} lead={t("gate.noAccessText")} />
    );
  }

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <Container className="pb-20">
        <AdminNav isAdmin={user.role === "admin"} />
        <div className="mt-8">{children}</div>
      </Container>
    </>
  );
}
