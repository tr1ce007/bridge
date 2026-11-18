import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Eyebrow } from "@/components/ui/section";

export function OpportunitiesTeaser() {
  const t = useTranslations("landing.opportunities");
  return (
    <section id="opportunities" aria-labelledby="opportunities-title" className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-3xl border border-primary/10 bg-primary-soft px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
            {/* An arch bridge in elevation, drawn faintly in the corner. */}
            <svg aria-hidden="true" viewBox="0 0 520 260" fill="none" className="pointer-events-none absolute -top-14 -right-12 -z-10 hidden w-[26rem] text-primary lg:block">
              <path d="M10 200 Q260 -40 510 200" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
              <path d="M40 200 Q260 10 480 200" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
              <line x1="0" y1="200" x2="520" y2="200" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" />
              {Array.from({ length: 19 }, (_, i) => 70 + i * 20).map((x) => {
                const t = (x - 10) / 500;
                const y = (1 - t) ** 2 * 200 + 2 * t * (1 - t) * -40 + t ** 2 * 200;
                return <line key={x} x1={x} y1={y} x2={x} y2="200" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />;
              })}
            </svg>
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h2
              id="opportunities-title"
              className="max-w-3xl font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-5xl"
            >
              {t("title")}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{t("lead")}</p>
            <p className="mt-10 max-w-3xl font-display text-2xl font-semibold tracking-tight text-accent-text sm:text-3xl">{t("programs")}</p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">{t("note")}</p>
              <Button href="/opportunities" className="shrink-0">
                {t("cta")}
                <span aria-hidden="true">→</span>
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
