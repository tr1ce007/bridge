"use client";

import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildProfileSummary } from "@/lib/ai/profile";
import { ChatRequestError, streamChatReply, type ChatErrorKind } from "@/lib/chat/client";
import { newId } from "@/lib/chat/ids";
import { toRequestMessages, trimSummary } from "@/lib/chat/request";
import { getUserStore, storageMode, type Conversation, type Locale, type StoredMessage } from "@/lib/data";
import { restoreSession } from "@/lib/questionnaire/session";

export type ChatMessage = StoredMessage;

export interface ChatError {
  kind: ChatErrorKind;
  /** Localized text from the route (429 / 400), used instead of our own copy when present. */
  message?: string;
}

/** How many turns are kept in storage (the route only ever reads the last 40). */
const MAX_STORED = 200;
const TITLE_LENGTH = 60;

function makeMessage(role: ChatMessage["role"], content: string, after?: ChatMessage): ChatMessage {
  // createdAt is the sort key in Supabase, so it must grow even within one millisecond.
  let at = Date.now();
  if (after) at = Math.max(at, Date.parse(after.createdAt) + 1);
  return { id: newId(), role, content, createdAt: new Date(at).toISOString() };
}

async function loadProfileSummary(locale: Locale): Promise<string | undefined> {
  try {
    const session = await getUserStore().loadSession();
    if (!session) return undefined;
    const answers = restoreSession(session).answers;
    return answers.length ? trimSummary(buildProfileSummary(answers, locale)) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * State and actions of the chat page. The conversation lives in memory; it is written to the user store
 * (and the questionnaire summary is sent to the model) only while the memory toggle is on.
 */
export function useChat() {
  const locale = useLocale() as Locale;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [demo, setDemo] = useState(false);
  const [memoryConsent, setMemoryConsentState] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageIssue, setStorageIssue] = useState<"blocked" | "failed" | null>(null);

  const messagesRef = useRef<ChatMessage[]>([]);
  const consentRef = useRef(false);
  const streamingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const meta = useRef<{ id: string; createdAt: string }>({ id: newId(), createdAt: new Date().toISOString() });
  /** All store writes run one after another, so an older save can never overwrite a newer one or a clear. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const commit = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const enqueue = useCallback((job: () => Promise<void>) => {
    queue.current = queue.current.then(job).catch(() => setStorageIssue("failed"));
  }, []);

  // First load: AI status, the saved preference and, when memory is on, the saved conversation.
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ai/status")
      .then((r) => (r.ok ? (r.json() as Promise<{ demo?: boolean }>) : null))
      .then((s) => {
        if (!cancelled && s?.demo) setDemo(true);
      })
      .catch(() => {});
    (async () => {
      try {
        const store = getUserStore();
        const prefs = await store.getPreferences();
        if (cancelled) return;
        consentRef.current = prefs.memoryConsent;
        setMemoryConsentState(prefs.memoryConsent);
        if (prefs.memoryConsent) {
          const saved = await store.loadConversation();
          // Never replace something the person has already started.
          if (!cancelled && saved && messagesRef.current.length === 0) {
            meta.current = { id: saved.id, createdAt: saved.createdAt };
            commit(saved.messages);
          }
        }
      } catch {
        // the chat works without storage
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [commit]);

  // Abort a running answer when the page is left.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Save after every settled change while memory is on.
  useEffect(() => {
    if (!memoryConsent || streaming || messages.length === 0) return;
    const snapshot = messages.slice(-MAX_STORED);
    const first = snapshot.find((m) => m.role === "user");
    const conversation: Conversation = {
      id: meta.current.id,
      title: first ? first.content.slice(0, TITLE_LENGTH) : undefined,
      messages: snapshot,
      createdAt: meta.current.createdAt,
      updatedAt: snapshot[snapshot.length - 1].createdAt,
    };
    enqueue(async () => {
      await getUserStore().saveConversation(conversation);
      setStorageIssue(storageMode() === "memory" ? "blocked" : null);
    });
  }, [messages, streaming, memoryConsent, enqueue]);

  const run = useCallback(
    async (history: ChatMessage[]) => {
      const assistant = makeMessage("assistant", "", history[history.length - 1]);
      commit([...history, assistant]);
      streamingRef.current = true;
      setStreaming(true);
      setError(null);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const consent = consentRef.current;
        const profileSummary = consent ? await loadProfileSummary(locale) : undefined;
        const result = await streamChatReply({
          messages: toRequestMessages(history),
          locale,
          memoryConsent: consent,
          profileSummary,
          signal: controller.signal,
          onChunk: (chunk) =>
            commit(messagesRef.current.map((m) => (m.id === assistant.id ? { ...m, content: m.content + chunk } : m))),
        });
        if (result.demo) setDemo(true);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof ChatRequestError ? { kind: e.kind, message: e.serverMessage } : { kind: "server" });
        }
      } finally {
        // An empty placeholder (stopped early, or failed before the first word) is not kept.
        commit(messagesRef.current.filter((m) => m.id !== assistant.id || m.content.trim() !== ""));
        if (abortRef.current === controller) abortRef.current = null;
        streamingRef.current = false;
        setStreaming(false);
      }
    },
    [commit, locale],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || streamingRef.current) return false;
      const history = [...messagesRef.current, makeMessage("user", content, messagesRef.current.at(-1))];
      void run(history);
      return true;
    },
    [run],
  );

  /** After an error: ask again for the last answer (a half-written one is dropped first). */
  const retry = useCallback(() => {
    if (streamingRef.current) return;
    const history = [...messagesRef.current];
    while (history.length && history[history.length - 1].role === "assistant") history.pop();
    if (history.length) void run(history);
  }, [run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    commit([]);
    setError(null);
    meta.current = { id: newId(), createdAt: new Date().toISOString() };
    enqueue(async () => {
      await getUserStore().clearConversations();
      setStorageIssue(null);
    });
  }, [commit, enqueue]);

  const setMemoryConsent = useCallback(
    (on: boolean) => {
      consentRef.current = on;
      setMemoryConsentState(on);
      setStorageIssue(null);
      enqueue(async () => {
        const store = getUserStore();
        await store.savePreferences({ memoryConsent: on });
        // Turning memory off erases what was kept. Turning it on saves via the effect above.
        if (!on) await store.clearConversations();
        if (on) setStorageIssue(storageMode() === "memory" ? "blocked" : null);
      });
    },
    [enqueue],
  );

  return { messages, streaming, error, demo, memoryConsent, ready, storageIssue, send, retry, stop, clear, setMemoryConsent };
}
