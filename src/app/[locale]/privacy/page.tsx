import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactNote } from "@/components/contact-note";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "privacy" });
  return { title: t("metaTitle"), description: t("lead") };
}

const SECTIONS = [
  { id: "where", title: "whereTitle", items: ["where1", "where2", "where3", "where4"] },
  { id: "ai", title: "aiTitle", items: ["ai1", "ai2", "ai3", "ai4"] },
  { id: "memory", title: "memoryTitle", items: ["memory1", "memory2", "memory3"] },
  { id: "yours", title: "yoursTitle", items: ["yours1", "yours2", "yours3"] },
  { id: "ads", title: "adsTitle", items: ["ads1", "ads2"] },
  { id: "limits", title: "limitsTitle", items: ["limits1", "limits2"] },
] as const;

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("privacy");
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <Container className="pb-20">
        <div className="max-w-3xl space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.id} aria-labelledby={`privacy-${s.id}`}>
              <h2 id={`privacy-${s.id}`} className="font-display text-2xl font-semibold tracking-tight">
                {t(s.title)}
              </h2>
              <ul className="mt-4 space-y-3 text-[0.95rem] leading-relaxed">
                {s.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{t(item)}</span>
                  </li>
                ))}
              </ul>
              {s.id === "yours" && <ContactNote variant="delete" className="mt-4 text-[0.95rem] leading-relaxed" />}
            </section>
          ))}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button href="/settings">{t("ctaSettings")}</Button>
          </div>
        </div>
      </Container>
    </>
  );
}
