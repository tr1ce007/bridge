import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** Round brand mark (cropped from public/brand/logo.jpg). */
export function LogoMark({ className }: { className?: string }) {
  const t = useTranslations("brand");
  return (
    <span className={cn("relative block size-9 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-border", className)}>
      <Image
        src="/brand/logo.jpg"
        alt={t("logoAlt")}
        fill
        sizes="48px"
        className="scale-[1.12] object-cover"
        style={{ objectPosition: "50% 46%" }}
        priority
      />
    </span>
  );
}

/** Logo mark + typographic wordmark, linking home. */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations("brand");
  return (
    <Link href="/" aria-label={t("home")} className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <span className="whitespace-nowrap font-display text-[0.95rem] font-bold tracking-[0.2em]">{t("name")}</span>
    </Link>
  );
}
