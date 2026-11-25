import type { Metadata } from "next";
import Image from "next/image";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BridgeLine } from "@/components/bridge-line";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { teamContact } from "@/lib/site-settings/contact";
import { getSiteSettings } from "@/lib/site-settings/load";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "about" });
  return { title: t("metaTitle"), description: t("lead") };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("about");
  const TEAM_CONTACT = teamContact((await getSiteSettings()).contact);
  const c = await getTranslations("landing.community");
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />

      <Container className="pb-20">
        <blockquote className="max-w-3xl border-l-2 border-accent pl-5 font-display text-2xl font-medium leading-snug tracking-tight text-balance sm:text-3xl">
          {t("mission")}
        </blockquote>

        <section aria-labelledby="about-what" className="mt-14">
          <h2 id="about-what" className="font-display text-2xl font-semibold tracking-tight">
            {t("whatTitle")}
          </h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {(["what1", "what2", "what3", "what4"] as const).map((k) => (
              <li key={k} className="rounded-3xl border border-border bg-card shadow-card p-5 text-[0.95rem] leading-relaxed sm:p-6">
                {t(k)}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="about-principles" className="mt-14">
          <h2 id="about-principles" className="font-display text-2xl font-semibold tracking-tight">
            {t("principlesTitle")}
          </h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {(["free", "noAds", "noPaid"] as const).map((k) => (
              <li key={k} className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-6">
                <h3 className="font-display text-lg font-semibold">{t(`${k}Title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`${k}Text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="about-founder" className="mt-14 grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div>
            <h2 id="about-founder" className="font-display text-2xl font-semibold tracking-tight">
              {t("founderTitle")}
            </h2>
            <p className="mt-4 font-display text-xl font-medium leading-snug">{t("founder")}</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t("founderNote")}</p>
          </div>
          <figure className="overflow-hidden rounded-2xl border border-border bg-white">
            <a href="/brand/certificate.webp" target="_blank" rel="noopener" title={t("certificateOpen")} className="block">
              <Image src="/brand/certificate.webp" alt={t("certificateAlt")} width={966} height={1280} sizes="(min-width: 768px) 320px, 100vw" className="h-auto w-full" />
            </a>
            <figcaption className="border-t border-border bg-card p-3 text-xs leading-relaxed text-muted">{t("certificateCaption")}</figcaption>
          </figure>
        </section>

        <section aria-labelledby="about-partners" className="mt-14">
          <h2 id="about-partners" className="font-display text-2xl font-semibold tracking-tight">
            {t("partnersTitle")}
          </h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            <li className="flex h-full flex-col gap-6 rounded-2xl border border-border bg-card shadow-card p-6 sm:p-8">
              {/* The source image is a white disc on a dark photo; crop to the disc (same as the landing). */}
              <span className="relative size-28 shrink-0 overflow-hidden rounded-full bg-white">
                <Image src="/brand/ambassadors.webp" alt={c("ambassadorsAlt")} fill sizes="112px" className="scale-[1.18] object-cover" style={{ objectPosition: "51% 53%" }} />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight">{c("ambassadorsName")}</h3>
                <p className="mt-2 leading-relaxed text-muted">{c("ambassadorsText")}</p>
              </div>
            </li>
            <li className="flex h-full flex-col gap-6 rounded-2xl border border-border bg-card shadow-card p-6 sm:p-8">
              {/* Logo artwork is designed for a dark background, so it keeps one in both themes. */}
              <span className="relative block aspect-[678/368] h-28 shrink-0 overflow-hidden rounded-xl bg-black">
                <Image src="/brand/adal-azamat.png" alt={c("adalAlt")} fill sizes="210px" className="object-contain" />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight">{c("adalName")}</h3>
                <p className="mt-2 leading-relaxed text-muted">{c("adalText")}</p>
              </div>
            </li>
          </ul>
        </section>

        <section aria-labelledby="about-contact" className="mt-14">
          <h2 id="about-contact" className="font-display text-2xl font-semibold tracking-tight">
            {t("contactTitle")}
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            <li>
              <a
                href={TEAM_CONTACT.instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="card-hover group flex h-full flex-col gap-1 rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-text">Instagram</span>
                <span className="font-display text-xl font-semibold tracking-tight">{TEAM_CONTACT.instagram}</span>
              </a>
            </li>
            <li>
              <a href={TEAM_CONTACT.phoneHref} className="card-hover group flex h-full flex-col gap-1 rounded-2xl border border-border bg-card p-6 shadow-card">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-text">{t("contactPhone")}</span>
                <span className="font-display text-xl font-semibold tracking-tight whitespace-nowrap">{TEAM_CONTACT.phone}</span>
              </a>
            </li>
          </ul>
        </section>

        <BridgeLine className="mt-14" />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/explore">{t("ctaExplore")}</Button>
          <Button href="/privacy" variant="ghost">
            {t("ctaPrivacy")}
          </Button>
        </div>
      </Container>
    </>
  );
}
