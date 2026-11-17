"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CHAT_MAX_MESSAGE_CHARS } from "@/lib/ai/chat-limits";

/** Textarea composer. Enter sends, Shift+Enter adds a line; while an answer streams the button becomes Stop. */
export function ChatInput({
  streaming,
  onSend,
  onStop,
}: {
  streaming: boolean;
  onSend: (text: string) => boolean;
  onStop: () => void;
}) {
  const t = useTranslations("chat");
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the text, up to the CSS max-height.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const submit = () => {
    if (streaming || !value.trim()) return;
    if (onSend(value)) setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    submit();
  };

  const nearLimit = value.length >= CHAT_MAX_MESSAGE_CHARS * 0.8;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2 rounded-3xl border border-border bg-card p-2 focus-within:border-primary">
        <label htmlFor="chat-input" className="sr-only">
          {t("inputLabel")}
        </label>
        <textarea
          id="chat-input"
          ref={ref}
          rows={1}
          maxLength={CHAT_MAX_MESSAGE_CHARS}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("inputPlaceholder")}
          className="max-h-44 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-snug placeholder:text-muted/80 focus:outline-none focus-visible:outline-none"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:border-fg/40 hover:bg-subtle"
          >
            {t("stop")}
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50"
          >
            {t("send")}
          </button>
        )}
      </div>
      <div className="mt-1.5 flex min-h-5 items-center justify-between gap-3 px-3 text-xs text-muted">
        <span className="hidden sm:inline">{t("inputHint")}</span>
        {nearLimit && (
          <span className="ml-auto tabular-nums" aria-live="polite">
            {t("counter", { count: value.length, max: CHAT_MAX_MESSAGE_CHARS })}
          </span>
        )}
      </div>
    </form>
  );
}
