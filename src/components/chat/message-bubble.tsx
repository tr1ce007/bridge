"use client";

import { useTranslations } from "next-intl";
import { AssistantText } from "./assistant-text";
import type { ChatMessage } from "./use-chat";

/** One turn. The person's text is shown as it was typed; the companion's as paragraphs and lists. */
export function MessageBubble({ message, pending }: { message: ChatMessage; pending: boolean }) {
  const t = useTranslations("chat");
  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-fg sm:max-w-[80%]">
          <span className="sr-only">{t("you")}: </span>
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{message.content}</p>
        </div>
      </li>
    );
  }
  return (
    <li className="border-l-2 border-accent pl-4 sm:pl-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-text">{t("assistant")}</p>
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
    </li>
  );
}
