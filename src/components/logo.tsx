"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useCustomLogo } from "./site-settings-provider";

/** Round brand mark (cropped from public/brand/logo.jpg, or the logo uploaded in admin → Appearance). */
export function LogoMark({ className }: { className?: string }) {
  const t = useTranslations("brand");
  const custom = useCustomLogo();
  return (
    <span className={cn("relative block size-9 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-border", className)}>
      {custom ? (
        // Logo uploaded in admin → Appearance (already resized, served from /api/site-logo).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={custom} alt={t("logoAlt")} className="absolute inset-0 size-full object-cover" />
      ) : (
      <Image
        src="/brand/logo.jpg"
        alt={t("logoAlt")}
        fill
        sizes="48px"
        className="scale-[1.12] object-cover"
        style={{ objectPosition: "50% 46%" }}
        priority
      />
      )}
    </span>
  );
}

/** Logo mark + typographic wordmark, linking home. */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations("brand");
  return (
    <Link href="/" aria-label={t("home")} className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      {/* On the narrowest phones (under 380px) only the round mark shows, so the header fits. */}
      <span className="whitespace-nowrap font-display text-[0.95rem] font-bold tracking-[0.2em] max-[379px]:sr-only">{t("name")}</span>
    </Link>
  );
}
