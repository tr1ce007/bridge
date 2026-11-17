"use client";

import { useTranslations } from "next-intl";

type Props = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  labelledBy: string;
};

/** 1-5 scale as native radios (arrow keys work). Endpoint labels describe preferences, never personality types. */
export function ScaleInput({ name, value, onChange, min, max, labelledBy }: Props) {
  const t = useTranslations("explore");
  return (
    <div role="radiogroup" aria-labelledby={labelledBy}>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-border bg-card font-display text-lg font-semibold transition-colors hover:border-fg/40 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-fg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name={name}
              value={String(n)}
              checked={value === String(n)}
              onChange={() => onChange(String(n))}
              aria-label={[t("scaleValue", { n }), n === 1 ? min : n === 5 ? max : undefined].filter(Boolean).join(" — ")}
              className="sr-only"
            />
            <span aria-hidden="true">{n}</span>
          </label>
        ))}
      </div>
      {(min || max) && (
        <div className="mt-3 flex justify-between gap-6 text-sm text-muted">
          <span className="max-w-[45%]">{min}</span>
          <span className="max-w-[45%] text-right">{max}</span>
        </div>
      )}
    </div>
  );
}
