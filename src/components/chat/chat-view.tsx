"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";
import { ChatInput } from "./chat-input";
import { MemoryToggle } from "./memory-toggle";
import { MessageBubble } from "./message-bubble";
import { StarterPrompts } from "./starter-prompts";
import { useAutoScroll } from "./use-auto-scroll";
import { useChat, type ChatError } from "./use-chat";

const noticeBox = "rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm leading-relaxed";
const alertBox = "rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed";

function errorText(error: ChatError, t: ReturnType<typeof useTranslations<"chat">>): string {
  // The route's own localized text wins for 429 / 400; otherwise our copy.
  if (error.message && (error.kind === "rateLimited" || error.kind === "invalid")) return error.message;
  switch (error.kind) {
    case "network":
      return t("errorNetwork");
    case "rateLimited":
      return t("errorRateLimited");
    case "invalid":
      return t("errorInvalid");
    case "interrupted":
      return t("errorInterrupted");
    default:
      return t("errorServer");
  }
}

/** /chat: "Давай разберёмся". Intro and starters while empty, then the conversation with a sticky composer. */
export function ChatView() {
  const t = useTranslations("chat");
  const chat = useChat();
  const { messages, streaming, error } = chat;
  const [confirmClear, setConfirmClear] = useState(false);
  const last = messages[messages.length - 1];
  const { endRef, away, scrollToEnd } = useAutoScroll(`${messages.length}:${last?.content.length ?? 0}:${error ? 1 : 0}`, messages.length > 0);

  const handleSend = (text: string) => {
    scrollToEnd();
    return chat.send(text);
  };

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-2xl flex-col">
        <header>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg shadow-button">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M2 17h20M5 17V8M19 17V8M5 9q7 9 14 0" />
              </svg>
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-text">{t("eyebrow")}</p>
          </div>
          <h1 className="mt-5 font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-5xl">{t("title")}</h1>
          {messages.length === 0 && <p className="mt-4 text-base leading-relaxed text-muted text-pretty sm:text-lg">{t("intro")}</p>}
        </header>

        {chat.demo && (
          <div role="note" className={`mt-6 ${noticeBox}`}>
            <p className="font-semibold text-accent-text">{t("demoBanner")}</p>
            <p className="mt-1 text-muted">{t("demoBannerLead")}</p>
          </div>
        )}

        <div className="mt-6">
          <MemoryToggle checked={chat.memoryConsent} onChange={chat.setMemoryConsent} disabled={!chat.ready} issue={chat.storageIssue} offFailed={chat.memoryOffFailed} />
        </div>

        {messages.length === 0 ? (
          <StarterPrompts onPick={handleSend} disabled={!chat.ready} />
        ) : (
          <section aria-label={t("transcriptLabel")} className="mt-8">
            <div className="mb-4 flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("transcriptLabel")}</h2>
              {confirmClear ? (
                <div role="group" aria-label={t("clear")} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span>{chat.memoryConsent ? t("clearAskStored") : t("clearAsk")}</span>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      setConfirmClear(false);
                      chat.clear();
                    }}
                    className="min-h-9 font-semibold text-primary underline underline-offset-2"
                  >
                    {t("clearYes")}
                  </button>
                  <button type="button" onClick={() => setConfirmClear(false)} className="min-h-9 text-muted underline underline-offset-2">
                    {t("clearNo")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="min-h-9 text-sm text-muted underline underline-offset-2 hover:text-fg"
                >
                  {t("clear")}
                </button>
              )}
            </div>
            <ol role="log" aria-live="polite" aria-relevant="additions" className="space-y-6">
              {messages.map((m, i) => (
                <MessageBubble key={m.id} message={m} pending={streaming && i === messages.length - 1} />
              ))}
            </ol>
          </section>
        )}

        <div className="flex-1" />
        <div ref={endRef} className="scroll-mb-56" aria-hidden="true" />

        {/* Stays at the bottom of the screen once there is a conversation to scroll through. */}
        <div className={cn("-mx-4 mt-6 bg-bg px-4 pt-3 pb-4 sm:-mx-6 sm:px-6", messages.length > 0 && "sticky bottom-0 z-10")}>
          {away && messages.length > 0 && (
            <button
              type="button"
              onClick={scrollToEnd}
              className="absolute -top-11 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card shadow-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-primary/40 hover:bg-primary-soft/50"
            >
              {t("jumpDown")} ↓
            </button>
          )}
          {error && !streaming && (
            <div role="alert" className={`mb-3 flex flex-wrap items-center justify-between gap-3 ${alertBox}`}>
              <p className="min-w-0 flex-1 text-amber-800 dark:text-amber-300">{errorText(error, t)}</p>
              <button
                type="button"
                onClick={chat.retry}
                className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary-soft/50 hover:bg-card"
              >
                {t("retry")}
              </button>
            </div>
          )}
          <ChatInput streaming={streaming} disabled={!chat.ready} onSend={handleSend} onStop={chat.stop} />
          <p className="mt-2 px-3 text-xs leading-relaxed text-muted">{t("disclaimer")}</p>
          <p className="mt-1 px-3 text-xs leading-relaxed text-muted">{t("privacyHint")}</p>
        </div>
      </div>
    </Container>
  );
}
