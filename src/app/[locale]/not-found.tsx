import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <Container className="py-28 sm:py-40">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">{t("code")}</p>
      <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-6xl">
        {t("title")}
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">{t("lead")}</p>
      <Button href="/" className="mt-10">
        {t("cta")}
      </Button>
    </Container>
  );
}
