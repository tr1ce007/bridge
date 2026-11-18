"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GuestImportCard } from "./guest-import-card";
import { signOut } from "./sign-out";

const emailSchema = z.email().max(254);

function Card({ children, labelledBy }: { children: React.ReactNode; labelledBy?: string }) {
  return (
    <section aria-labelledby={labelledBy} className="rounded-3xl border border-border bg-card shadow-card p-5 sm:p-6">
      {children}
    </section>
  );
}

/** Email magic link and (when enabled) Google. Rendered only when Supabase is configured. */
export function AuthPanel({ googleEnabled, errorKey }: { googleEnabled: boolean; errorKey: "link_invalid" | "unconfigured" | "failed" | null }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"form" | "sending" | "sent">("form");
  const [problem, setProblem] = useState<"invalid" | "send" | "google" | null>(null);
  const [leaving, setLeaving] = useState(false);

  const redirectTo = () => `${window.location.origin}/auth/callback?locale=${locale}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setProblem("invalid");
      return;
    }
    setProblem(null);
    setStep("sending");
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
        email: parsed.data,
        options: { emailRedirectTo: redirectTo() },
      });
      if (error) throw error;
      setStep("sent");
    } catch {
      setProblem("send");
      setStep("form");
    }
  }

  async function google() {
    setProblem(null);
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
      if (error) throw error;
    } catch {
      setProblem("google");
    }
  }

  if (auth.status === "loading") {
    return (
      <p role="status" className="text-muted">
        {t("loading")}
      </p>
    );
  }

  if (auth.status === "user") {
    return (
      <div className="grid gap-4">
        <Card labelledBy="signed-in-title">
          <h2 id="signed-in-title" className="font-display text-lg font-semibold tracking-tight">
            {t("signedInTitle")}
          </h2>
          <p className="mt-2 text-sm">{t("signedInAs", { email: auth.email ?? "" })}</p>
          <p className="mt-1 text-sm text-muted">{t("signedInLead")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href="/dashboard">{t("goDashboard")}</Button>
            <Button
              variant="ghost"
              disabled={leaving}
              onClick={async () => {
                setLeaving(true);
                try {
                  await signOut();
                } finally {
                  setLeaving(false);
                  router.refresh();
                }
              }}
            >
              {leaving ? t("signingOut") : t("signOut")}
            </Button>
          </div>
        </Card>
        <GuestImportCard userId={auth.id} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {errorKey && (
        <p role="alert" className="rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed">
          {t(`errors.${errorKey}`)}
        </p>
      )}
      <Card labelledBy="signin-title">
        {step === "sent" ? (
          <div role="status">
            <h2 id="signin-title" className="font-display text-lg font-semibold tracking-tight">
              {t("sentTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed">{t("sentText", { email: email.trim() })}</p>
            <Button variant="ghost" className="mt-4" onClick={() => setStep("form")}>
              {t("sentOther")}
            </Button>
          </div>
        ) : (
          <form onSubmit={sendLink} noValidate>
            <h2 id="signin-title" className="font-display text-lg font-semibold tracking-tight">
              {t("title")}
            </h2>
            <label htmlFor="auth-email" className="mt-4 block text-sm font-medium">
              {t("emailLabel")}
            </label>
            <input
              id="auth-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              aria-describedby="auth-email-help"
              aria-invalid={problem === "invalid"}
              className="mt-1.5 block min-h-11 w-full max-w-md rounded-xl border border-border bg-bg px-4 text-base"
            />
            <p id="auth-email-help" className="mt-1.5 text-sm text-muted">
              {t("emailHelp")}
            </p>
            {problem === "invalid" && (
              <p role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-400">
                {t("emailInvalid")}
              </p>
            )}
            {problem === "send" && (
              <p role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-400">
                {t("sendFailed")}
              </p>
            )}
            <Button type="submit" className="mt-4" disabled={step === "sending"}>
              {step === "sending" ? t("sending") : t("sendLink")}
            </Button>
          </form>
        )}
      </Card>

      {googleEnabled && step !== "sent" && (
        <Card>
          <p className="text-sm text-muted">{t("or")}</p>
          <Button variant="ghost" className="mt-3" onClick={google}>
            {t("google")}
          </Button>
          {problem === "google" && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-400">
              {t("googleFailed")}
            </p>
          )}
        </Card>
      )}
      <p className="text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]">
          {t("setupBack")}
        </Link>
      </p>
    </div>
  );
}
