import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InterestForm } from "@/components/mentors/interest-form";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata({ params }: PageProps<"/[locale]/mentors">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "mentors" });
  return { title: t("metaTitle"), description: t("lead") };
}

export default async function MentorsPage({ params }: PageProps<"/[locale]/mentors">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("mentors");
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <Container className="pb-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm leading-relaxed">
              <strong>{t("statusTitle")}</strong> {t("statusLead")}
            </p>
            <h2 className="mt-8 font-display text-xl font-semibold">{t("planTitle")}</h2>
            <ul className="mt-3 space-y-3 text-[0.95rem] leading-relaxed">
              {(["plan1", "plan2", "plan3"] as const).map((k) => (
                <li key={k} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">{t("formTitle")}</h2>
            <p className="mb-4 mt-1 text-sm text-muted">{t("formLead")}</p>
            <InterestForm />
          </div>
        </div>
      </Container>
    </>
  );
}
