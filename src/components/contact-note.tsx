import { useTranslations } from "next-intl";
import { contactInfo } from "@/lib/contact";

/**
 * How to reach the team: a mailto link when NEXT_PUBLIC_CONTACT_EMAIL is set, otherwise an honest
 * "the contact will appear here soon". `variant` picks the sentence (`delete`: for deleting the rest and
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
  if (!info) return <p className={className}>{t(variant === "delete" ? "deleteSoon" : "generalSoon")}</p>;
  const link = (chunks: React.ReactNode) => (
    <a href={info.href} className="font-semibold underline underline-offset-2">
      {chunks}
    </a>
  );
  return (
    <p className={className}>
      {t.rich(variant === "delete" ? "deleteWith" : "generalWith", { email: info.email, mail: link })}
    </p>
  );
}
