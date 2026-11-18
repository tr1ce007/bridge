"use client";

import { useTranslations } from "next-intl";
import { AssistantText } from "./assistant-text";
import type { ChatMessage } from "./use-chat";

/** One turn. The person's text is shown as it was typed; the companion's as paragraphs and lists. */
export function MessageBubble({
  message,
  pending,
}: {
  message: ChatMessage;
  pending: boolean;
}) {
  const t = useTranslations("chat");
  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-fg shadow-button sm:max-w-[80%]">
          <span className="sr-only">{t("you")}: </span>
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
            {message.content}
          </p>
        </div>
      </li>
    );
  }
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-x-3 sm:grid-cols-[2.25rem_1fr] sm:gap-x-4">
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-8 items-center justify-center rounded-full border border-primary/20 bg-primary-soft text-primary sm:size-9 dark:text-[var(--ring)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M2 17h20M5 17V8M19 17V8M5 9q7 9 14 0" />
        </svg>
      </span>
      <div className="min-w-0 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-card sm:px-5 sm:py-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent-text">
          {t("assistant")}
        </p>
        {message.content ? (
          <AssistantText text={message.content} />
        ) : (
          pending && (
            <p role="status" className="flex items-center gap-1.5 text-muted">
              <span className="sr-only">{t("thinking")}</span>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="size-1.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none"
                  style={{ animationDelay: `${i * 180}ms` }}
                />
              ))}
            </p>
          )
        )}
      </div>
    </li>
  );
}
