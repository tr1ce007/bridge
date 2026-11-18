"use client";

import { useId } from "react";

export interface FilterOption {
  value: string;
  label: string;
}

const control =
  "mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-card shadow-card px-3 text-[15px] text-fg focus-visible:border-primary";

/** Labelled native <select>; the first option (value "") is the "all" choice. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  anyLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  anyLabel: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={control}>
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Labelled search box. */
export function SearchField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={control}
      />
    </div>
  );
}
