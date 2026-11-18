"use client";

import { useTranslations } from "next-intl";

const KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

/** Conversation openers, shown while the conversation is empty. Clicking one sends it. */
export function StarterPrompts({ onPick, disabled }: { onPick: (text: string) => void; disabled?: boolean }) {
  const t = useTranslations("chat");
  return (
    <section aria-labelledby="starters-title" className="mt-8">
      <h2 id="starters-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">
        {t("startersLabel")}
      </h2>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {KEYS.map((key) => (
          <li key={key}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(t(key))}
              className="min-h-12 w-full rounded-2xl border border-border bg-card shadow-card px-4 py-3 text-left text-[15px] leading-snug transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
            >
              {t(key)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
