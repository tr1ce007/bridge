"use client";

import { useTranslations } from "next-intl";
import { Container } from "./container";
import { Button } from "./button";

/** Route `loading.tsx` body: a quiet skeleton of a title and a few cards. */
export function PageLoading({ cards = 4 }: { cards?: number }) {
  const t = useTranslations("states");
  return (
    <Container className="py-12 sm:py-20">
      <div role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">{t("loading")}</span>
        <div className="max-w-3xl animate-pulse motion-reduce:animate-none" aria-hidden="true">
          <div className="h-3 w-24 rounded-full bg-subtle" />
          <div className="mt-5 h-10 w-4/5 rounded-xl bg-subtle sm:h-14" />
          <div className="mt-5 h-4 w-full rounded-full bg-subtle" />
          <div className="mt-2 h-4 w-2/3 rounded-full bg-subtle" />
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-3xl border border-border bg-subtle motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </Container>
  );
}

/** Route `error.tsx` body: honest message and a retry button. */
export function PageError({ reset }: { reset: () => void }) {
  const t = useTranslations("states");
  return (
    <Container className="py-20 sm:py-28">
      <div role="alert" className="max-w-xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t("errorTitle")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{t("errorLead")}</p>
        <Button className="mt-8" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </Container>
  );
}
