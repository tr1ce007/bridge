import { useTranslations } from "next-intl";
import { TEAM_CONTACT, contactInfo } from "@/lib/contact";

const linkClass = "font-semibold underline underline-offset-2";

/**
 * How to reach the team: the team's phone and Instagram, plus a mailto link when
 * NEXT_PUBLIC_CONTACT_EMAIL is set. `variant` picks the sentence (`delete`: for deleting the rest and
 * the account; `general`: a plain contact line). `email` is only for tests; it defaults to the env var.
 */
export function ContactNote({
  variant,
  email,
  className,
}: {
  variant: "delete" | "general";
  email?: string | null;
  className?: string;
}) {
  const t = useTranslations("contact");
  const info = email === undefined ? contactInfo() : contactInfo(email ?? undefined);
  const tel = (chunks: React.ReactNode) => (
    <a href={TEAM_CONTACT.phoneHref} className={`${linkClass} whitespace-nowrap`}>
      {chunks}
    </a>
  );
  const ig = (chunks: React.ReactNode) => (
    <a href={TEAM_CONTACT.instagramHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {chunks}
    </a>
  );
  const mail = (chunks: React.ReactNode) => (
    <a href={info?.href} className={linkClass}>
      {chunks}
    </a>
  );
  const values = { phone: TEAM_CONTACT.phone, instagram: TEAM_CONTACT.instagram, tel, ig };
  if (!info) return <p className={className}>{t.rich(variant === "delete" ? "deleteTeam" : "generalTeam", values)}</p>;
  return (
    <p className={className}>
      {t.rich(variant === "delete" ? "deleteWith" : "generalWith", { ...values, email: info.email, mail })}
    </p>
  );
}
