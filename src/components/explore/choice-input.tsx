"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { OTHER_PREFIX } from "@/lib/questionnaire/bank";

type Props = {
  type: "single" | "multi";
  name: string;
  options: { key: string; label: string }[];
  allowOther: boolean;
  otherLabel: string;
  otherPlaceholder: string;
  maxSelect?: number;
  exclusive: readonly string[];
  /** single: one key (or `other:text`); multi: list of keys (and `other:text`). */
  value: string | string[];
  onChange: (value: string | string[]) => void;
  labelledBy: string;
};

const chip =
  "group flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-[15px] leading-snug transition-colors hover:border-fg/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45";

function Indicator({ shape }: { shape: "round" | "square" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5 shrink-0 place-items-center border border-border text-primary-fg transition-colors group-has-[:checked]:border-primary group-has-[:checked]:bg-primary",
        shape === "round" ? "rounded-full" : "rounded-md",
      )}
    >
      <svg viewBox="0 0 12 12" className="size-3 opacity-0 transition-opacity group-has-[:checked]:opacity-100">
        <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/**
 * Option chips built on native radios / checkboxes, so keyboard use (Tab, arrows, Space)
 * and screen readers work without extra code. Optional "other" chip with a text field.
 */
export function ChoiceInput({
  type,
  name,
  options,
  allowOther,
  otherLabel,
  otherPlaceholder,
  maxSelect,
  exclusive,
  value,
  onChange,
  labelledBy,
}: Props) {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  const keys = entries.filter((e) => !e.startsWith(OTHER_PREFIX));
  const otherEntry = entries.find((e) => e.startsWith(OTHER_PREFIX));
  const [otherOn, setOtherOn] = useState(Boolean(otherEntry));
  const [text, setText] = useState(otherEntry ? otherEntry.slice(OTHER_PREFIX.length) : "");
  const multi = type === "multi";

  function emit(nextKeys: string[], on: boolean, txt: string) {
    const other = on && txt.trim() ? `${OTHER_PREFIX}${txt.trim()}` : null;
    if (multi) onChange(other ? [...nextKeys, other] : nextKeys);
    else onChange(other ?? nextKeys[0] ?? "");
  }

  const count = keys.length + (otherOn ? 1 : 0);
  const atLimit = multi && maxSelect !== undefined && count >= maxSelect;

  function toggleKey(key: string) {
    if (!multi) {
      setOtherOn(false);
      emit([key], false, text);
      return;
    }
    if (keys.includes(key)) {
      emit(keys.filter((k) => k !== key), otherOn, text);
    } else if (exclusive.includes(key)) {
      setOtherOn(false);
      emit([key], false, text);
    } else {
      const withoutExclusive = keys.filter((k) => !exclusive.includes(k));
      emit([...withoutExclusive, key], otherOn, text);
    }
  }

  function toggleOther() {
    if (!multi) {
      setOtherOn(true);
      emit([], true, text);
      return;
    }
    if (otherOn) {
      setOtherOn(false);
      emit(keys, false, text);
    } else {
      setOtherOn(true);
      emit(keys.filter((k) => !exclusive.includes(k)), true, text);
    }
  }

  const inputType = multi ? "checkbox" : "radio";
  const shape = multi ? "square" : "round";

  return (
    <div role={multi ? "group" : "radiogroup"} aria-labelledby={labelledBy} className="grid gap-2.5 sm:grid-cols-2">
      {options.map((o) => {
        const checked = keys.includes(o.key);
        return (
          <label key={o.key} className={chip}>
            <input
              type={inputType}
              name={name}
              value={o.key}
              checked={checked}
              disabled={multi && atLimit && !checked && !exclusive.includes(o.key)}
              onChange={() => toggleKey(o.key)}
              className="sr-only"
            />
            <Indicator shape={shape} />
            <span>{o.label}</span>
          </label>
        );
      })}

      {allowOther && (
        <div className="sm:col-span-2">
          <label className={chip}>
            <input
              type={inputType}
              name={name}
              value="__other"
              checked={otherOn}
              disabled={multi && atLimit && !otherOn}
              onChange={toggleOther}
              className="sr-only"
            />
            <Indicator shape={shape} />
            <span>{otherLabel}</span>
          </label>
          {otherOn && (
            <input
              type="text"
              value={text}
              maxLength={200}
              placeholder={otherPlaceholder}
              aria-label={otherLabel}
              autoFocus
              onChange={(e) => {
                setText(e.target.value);
                emit(keys, true, e.target.value);
              }}
              className="mt-2.5 min-h-12 w-full rounded-2xl border border-border bg-card px-4 text-[15px] placeholder:text-muted/80 focus:border-primary"
            />
          )}
        </div>
      )}
    </div>
  );
}
