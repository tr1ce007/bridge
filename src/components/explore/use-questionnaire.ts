"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { getUserStore, storageMode, type Answer, type QuestionnaireSession } from "@/lib/data";
import { getQuestion, type Question } from "@/lib/questionnaire/bank";
import {
  MAX_QUESTIONS,
  applyAnswer,
  followUpId,
  isFollowUpId,
  nextQuestion,
  previousQuestion,
  skipAnswer,
} from "@/lib/questionnaire/engine";
import { MAX_FOLLOW_UPS, type FetchFollowUp, type FollowUp } from "@/lib/questionnaire/follow-up";
import { createSession, restoreSession, resumeQuestionId, withAnswers } from "@/lib/questionnaire/session";

export type View =
  | { kind: "loading" }
  | { kind: "intro" }
  | { kind: "question"; id: string; fromReview?: boolean }
  | { kind: "followUpLoading" }
  | { kind: "followUp"; source: string; followUp: FollowUp }
  | { kind: "review" }
  | { kind: "complete" };

const FOLLOW_UP_TIMEOUT_MS = 6000;

/** Resolves null after `ms` and aborts `controller`, so the underlying request stops too. */
function withTimeout<T>(p: Promise<T>, ms: number, controller: AbortController): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** Questionnaire state: restore, autosave after each answer, navigation (next / back / edit / restart). */
export function useQuestionnaire(fetchFollowUp?: FetchFollowUp) {
  const locale = useLocale();
  const [session, setSession] = useState<QuestionnaireSession | null>(null);
  const [view, setView] = useState<View>({ kind: "loading" });
  const [resumed, setResumed] = useState(false);
  const [memory, setMemory] = useState(false);
  const [saveError, setSaveError] = useState(false);
  /** True once the person has navigated (so we may move keyboard focus without stealing it on page load). */
  const [interacted, setInteracted] = useState(false);

  const sessionRef = useRef<QuestionnaireSession | null>(null);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const viewToken = useRef(0);
  /** The pending follow-up request, aborted on timeout, navigation or unmount. */
  const lookup = useRef<AbortController | null>(null);

  /** The person moved on: ignore and abort a pending follow-up lookup. */
  const cancelLookup = useCallback(() => {
    viewToken.current++;
    lookup.current?.abort();
    lookup.current = null;
  }, []);

  useEffect(() => () => lookup.current?.abort(), []);

  // ---- restore
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved: QuestionnaireSession | null = null;
      try {
        saved = await getUserStore().loadSession();
      } catch {
        saved = null;
      }
      if (cancelled) return;
      const s = saved ? restoreSession(saved) : createSession();
      sessionRef.current = s;
      setSession(s);
      const resumeId = resumeQuestionId(s);
      setResumed(s.answers.length > 0);
      setView(s.answers.length === 0 ? { kind: "intro" } : resumeId ? { kind: "question", id: resumeId } : { kind: "complete" });
      setMemory(storageMode() === "memory");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- autosave (serialised so an older save can never overwrite a newer one)
  const persist = useCallback((next: QuestionnaireSession) => {
    saveQueue.current = saveQueue.current
      .then(() => getUserStore().saveSession(next))
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true))
      .then(() => setMemory(storageMode() === "memory"));
  }, []);

  const commit = useCallback(
    (answers: Answer[]) => {
      const next = withAnswers(sessionRef.current ?? createSession(), answers);
      sessionRef.current = next;
      setSession(next);
      persist(next);
      return next;
    },
    [persist],
  );

  const goNext = useCallback((answers: Answer[]) => {
    const q = nextQuestion(answers);
    setView(q ? { kind: "question", id: q.id } : { kind: "complete" });
  }, []);

  const answers = session?.answers ?? [];

  // ---- actions
  const start = useCallback(() => {
    setInteracted(true);
    goNext(sessionRef.current?.answers ?? []);
  }, [goNext]);

  const answerQuestion = useCallback(
    async (q: Question, answer: Answer, fromReview?: boolean) => {
      setInteracted(true);
      const before = sessionRef.current?.answers ?? [];
      const nextAnswers = applyAnswer(before, answer);
      commit(nextAnswers);

      if (fromReview) {
        setView({ kind: "review" });
        return;
      }

      // Optional AI follow-up after a written answer (no-op unless a hook is plugged in).
      const followUps = nextAnswers.filter((a) => isFollowUpId(a.questionId)).length;
      const wrote = q.type === "text" && !answer.skipped;
      if (fetchFollowUp && wrote && followUps < MAX_FOLLOW_UPS && nextAnswers.length < MAX_QUESTIONS) {
        cancelLookup();
        const token = viewToken.current;
        const controller = new AbortController();
        lookup.current = controller;
        setView({ kind: "followUpLoading" });
        let found: FollowUp | null = null;
        try {
          found = await withTimeout(
            fetchFollowUp(nextAnswers, { questionId: q.id, locale, signal: controller.signal }),
            FOLLOW_UP_TIMEOUT_MS,
            controller,
          );
        } catch {
          found = null;
        }
        if (token !== viewToken.current) return; // the person moved on meanwhile
        if (found && found.title.trim()) {
          setView({ kind: "followUp", source: q.id, followUp: found });
          return;
        }
      }
      goNext(nextAnswers);
    },
    [cancelLookup, commit, fetchFollowUp, goNext, locale],
  );

  const answerFollowUp = useCallback(
    (source: string, followUp: FollowUp, text: string | null) => {
      setInteracted(true);
      const skipped = text === null || text.trim() === "";
      const answer: Answer = { questionId: followUpId(source), value: [followUp.title, skipped ? "" : text!.trim()], skipped: skipped || undefined };
      const next = applyAnswer(sessionRef.current?.answers ?? [], answer);
      commit(next);
      goNext(next);
    },
    [commit, goNext],
  );

  const skipQuestion = useCallback(
    (q: Question, fromReview?: boolean) => {
      void answerQuestion(q, skipAnswer(q), fromReview);
    },
    [answerQuestion],
  );

  const back = useCallback(() => {
    cancelLookup();
    setInteracted(true);
    const current = sessionRef.current?.answers ?? [];
    setView((v) => {
      if (v.kind === "followUp") return { kind: "question", id: v.source };
      if (v.kind === "question" && v.fromReview) return { kind: "review" };
      const prev = previousQuestion(current, v.kind === "question" ? v.id : null);
      return prev ? { kind: "question", id: prev.id } : v;
    });
  }, [cancelLookup]);

  const editQuestion = useCallback((id: string, fromReview = true) => {
    cancelLookup();
    setInteracted(true);
    setView({ kind: "question", id, fromReview });
  }, [cancelLookup]);

  const openReview = useCallback(() => {
    cancelLookup();
    setInteracted(true);
    setView({ kind: "review" });
  }, [cancelLookup]);

  const continueFromReview = useCallback(() => {
    setInteracted(true);
    goNext(sessionRef.current?.answers ?? []);
  }, [goNext]);

  /** Clears the questionnaire session only (reports, roadmap, journal, saved items stay). */
  const restart = useCallback(() => {
    cancelLookup();
    const fresh = createSession();
    sessionRef.current = fresh;
    setSession(fresh);
    persist(fresh);
    setResumed(false);
    setInteracted(false);
    setView({ kind: "intro" });
  }, [cancelLookup, persist]);

  const currentQuestion = view.kind === "question" ? (getQuestion(view.id) ?? null) : null;

  return {
    ready: view.kind !== "loading",
    answers,
    view,
    currentQuestion,
    resumed,
    memory,
    saveError,
    interacted,
    start,
    answerQuestion,
    answerFollowUp,
    skipQuestion,
    back,
    editQuestion,
    openReview,
    continueFromReview,
    restart,
    jumpTo: (id: string) => editQuestion(id, false),
  };
}
