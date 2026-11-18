import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

const SQL = "update profiles set role='admin' where id='<your user id>';";
const ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

/** Shown at /admin when Supabase is not configured: how to get an admin panel at all. */
export function SetupGuide() {
  const t = useTranslations("admin.setup");
  const steps = [
    { title: t("step1Title"), text: t("step1Text") },
    { title: t("step2Title"), text: t("step2Text") },
    { title: t("step3Title"), text: t("step3Text"), code: ENV.join("\n"), codeLabel: t("envLabel") },
    { title: t("step4Title"), text: t("step4Text"), code: SQL, codeLabel: t("sqlLabel") },
  ];
  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      <Container className="pb-20">
        <ol className="grid max-w-3xl grid-cols-1 gap-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                <span className="mr-2 text-accent-text">{i + 1}.</span>
                {s.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              {s.code && (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{s.codeLabel}</p>
                  <pre className="mt-1.5 overflow-x-auto rounded-xl border border-border bg-bg p-3 text-sm">
                    <code>{s.code}</code>
                  </pre>
                </>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-3xl text-sm text-muted">{t("note")}</p>
      </Container>
    </>
  );
}
