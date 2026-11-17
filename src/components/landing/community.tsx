import Image from "next/image";
import { useTranslations } from "next-intl";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

export function Community() {
  const t = useTranslations("landing.community");
  return (
    <Section id="community" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("partnersLabel")}</p>
      <ul className="grid gap-4 md:grid-cols-2">
        <Reveal as="li" className="flex h-full flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
            {/* The source image is a white disc on a dark photo; crop to the disc. */}
            <span className="relative size-28 shrink-0 overflow-hidden rounded-full bg-white">
              <Image
                src="/brand/ambassadors.webp"
                alt={t("ambassadorsAlt")}
                fill
                sizes="112px"
                className="scale-[1.18] object-cover"
                style={{ objectPosition: "51% 53%" }}
              />
            </span>
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight">{t("ambassadorsName")}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t("ambassadorsText")}</p>
            </div>
          </Reveal>
        <Reveal as="li" delay={0.08} className="flex h-full flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
            {/* Logo artwork is designed for a dark background, so it keeps one in both themes. */}
            <span className="relative block aspect-[678/368] h-28 shrink-0 overflow-hidden rounded-xl bg-black">
              <Image src="/brand/adal-azamat.png" alt={t("adalAlt")} fill sizes="210px" className="object-contain" />
            </span>
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight">{t("adalName")}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t("adalText")}</p>
            </div>
          </Reveal>
      </ul>
    </Section>
  );
}
