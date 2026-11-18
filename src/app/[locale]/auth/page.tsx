import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthPanel } from "@/components/auth/auth-panel";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { isAuthErrorParam } from "@/lib/auth/callback";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/auth">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "auth" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function Page({ params, searchParams }: PageProps<"/[locale]/auth">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { error } = await searchParams;
  const t = await getTranslations("auth");
  const configured = isSupabaseConfigured();
  // Read on the server so the value is the one the site was started with.
  const googleEnabled = configured && process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const errorKey = isAuthErrorParam(error) ? error : null;

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <Container className="pb-20">
        <div className="grid max-w-3xl gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <section aria-labelledby="guest-title" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-6">
              <h2 id="guest-title" className="font-display text-lg font-semibold tracking-tight">
                {t("guestTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t("guestText")}</p>
            </section>
            <section aria-labelledby="sync-title" className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-6">
              <h2 id="sync-title" className="font-display text-lg font-semibold tracking-tight">
                {t("syncTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t("syncText")}</p>
            </section>
          </div>

          {configured ? (
            <AuthPanel googleEnabled={googleEnabled} errorKey={errorKey} />
          ) : (
            <section aria-labelledby="setup-title" role="note" className="rounded-3xl border border-primary/20 bg-primary-soft p-5 sm:p-6">
              <h2 id="setup-title" className="font-display text-lg font-semibold tracking-tight">
                {t("setupTitle")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed">{t("setupText")}</p>
              <Button href="/" variant="ghost" className="mt-4">
                {t("setupBack")}
              </Button>
            </section>
          )}
        </div>
      </Container>
    </>
  );
}
