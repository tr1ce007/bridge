"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getQuestion } from "@/lib/questionnaire/bank";
import { pendingQuestions, previousQuestion, progress } from "@/lib/questionnaire/engine";
import { fetchFollowUp as defaultFetchFollowUp, type FetchFollowUp } from "@/lib/questionnaire/follow-up";
import { CompleteScreen } from "./complete-screen";
import { ProgressBar } from "./progress-bar";
import { QuestionCard } from "./question-card";
import { RestartConfirm } from "./restart-confirm";
import { ReviewList } from "./review-list";
import { useQuestionCopy } from "./use-question-copy";
import { useQuestionnaire } from "./use-questionnaire";

const notice =
  "rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm leading-relaxed text-accent-text";
const alertNotice =
  "rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm leading-relaxed text-amber-800 dark:text-amber-300";

/**
 * The /explore experience: one question per screen, autosave, back / skip / edit, restart.
 * `fetchFollowUp` is the pluggable AI follow-up hook (calls /api/ai/followup, see lib/questionnaire/follow-up.ts).
 */
export function ExploreFlow({ fetchFollowUp = defaultFetchFollowUp }: { fetchFollowUp?: FetchFollowUp }) {
  const t = useTranslations("explore");
  const copy = useQuestionCopy();
  const qn = useQuestionnaire(fetchFollowUp);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const restartBtnRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  const cancelRestart = useCallback(() => setConfirmRestart(false), []);

  // When the restart dialog closes, put focus back on the Restart button (it is gone after a
  // confirmed restart, so fall back to the top of the flow).
  useEffect(() => {
    if (wasConfirming.current && !confirmRestart) {
      (restartBtnRef.current ?? topRef.current)?.focus({ preventScroll: true });
    }
    wasConfirming.current = confirmRestart;
  }, [confirmRestart]);

  const { view, answers } = qn;
  const q = qn.currentQuestion;
  const block = q?.block ?? (view.kind === "followUp" ? getQuestion(view.source)?.block : undefined);
  const showHeader = qn.ready && view.kind !== "intro";

  // Which screen is showing; changing it triggers the transition.
  const screenKey =
    view.kind === "question" ? `q-${view.id}` : view.kind === "followUp" ? `fu-${view.source}` : view.kind;

  // After the person moves to another screen, make sure its top is in view (review lists are long).
  useEffect(() => {
    if (!qn.interacted) return;
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }, [screenKey, qn.interacted]);

  return (
    <Container className="py-8 sm:py-14">
      <div ref={topRef} tabIndex={-1} style={{ outline: "none" }} className="mx-auto max-w-2xl scroll-mt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">{t("eyebrow")}</p>
        <h1 className="sr-only">{t("pageHeading")}</h1>

        {qn.memory && (
          <p role="status" className={`mt-4 ${notice}`}>
            {t("memoryNotice")}
          </p>
        )}
        {qn.saveError && (
          <p role="alert" className={`mt-4 ${alertNotice}`}>
            {t("saveFailed")}
          </p>
        )}

        {showHeader && (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-4 text-sm">
              <p className="min-w-0 font-medium text-muted">{block ? t(`blocks.${block}`) : " "}</p>
              {answers.length > 0 && view.kind !== "review" && (
                <button
                  type="button"
                  onClick={qn.openReview}
                  className="min-h-11 shrink-0 rounded-full px-3 font-medium text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]"
                >
                  {t("myAnswers")}
                </button>
              )}
            </div>
            <ProgressBar value={view.kind === "complete" ? 1 : progress(answers)} />
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-border bg-card shadow-card p-6 sm:p-10" aria-busy={!qn.ready}>
          {confirmRestart && (
            <RestartConfirm
              onCancel={cancelRestart}
              onConfirm={() => {
                setConfirmRestart(false);
                qn.restart();
              }}
            />
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screenKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {!qn.ready && <p className="py-10 text-center text-muted">{t("loading")}</p>}

              {view.kind === "intro" && (
                <div>
                  <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
                    {t("introTitle")}
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-muted text-pretty">{t("introLead")}</p>
                  <ul className="mt-6 space-y-2 text-[15px] text-muted">
                    {(["introPoint1", "introPoint2", "introPoint3"] as const).map((k) => (
                      <li key={k} className="flex gap-3">
                        <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                        {t(k)}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-8" onClick={qn.start}>
                    {t("start")} <span aria-hidden="true">→</span>
                  </Button>
                </div>
              )}

              {view.kind === "question" && q && (
                <QuestionCard
                  key={q.id}
                  question={copy.card(q)}
                  initial={answers.find((a) => a.questionId === q.id)}
                  editing={view.fromReview}
                  focusTitle={qn.interacted}
                  onBack={view.fromReview || previousQuestion(answers, q.id) ? qn.back : undefined}
                  onSubmit={(value) => void qn.answerQuestion(q, { questionId: q.id, value }, view.fromReview)}
                  onSkip={() => qn.skipQuestion(q, view.fromReview)}
                />
              )}

              {view.kind === "followUpLoading" && (
                <p role="status" className="py-10 text-center text-muted">
                  {t("followUpLoading")}
                </p>
              )}

              {view.kind === "followUp" && (
                <QuestionCard
                  key={`fu-${view.source}`}
                  question={copy.followUpCard(view.source, view.followUp)}
                  focusTitle
                  onBack={qn.back}
                  onSubmit={(value) =>
                    qn.answerFollowUp(view.source, view.followUp, Array.isArray(value) ? value.join(", ") : value)
                  }
                  onSkip={() => qn.answerFollowUp(view.source, view.followUp, null)}
                />
              )}

              {view.kind === "review" && (
                <ReviewList
                  answers={answers}
                  pending={pendingQuestions(answers)}
                  onEdit={(id) => qn.editQuestion(id)}
                  onContinue={qn.continueFromReview}
                />
              )}

              {view.kind === "complete" && (
                <CompleteScreen answers={answers} onJump={qn.jumpTo} onReview={qn.openReview} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {qn.ready && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>{qn.resumed && !qn.interacted ? t("resumed") : qn.memory ? " " : t("localNote")}</p>
            {answers.length > 0 && !confirmRestart && (
              <button
                ref={restartBtnRef}
                type="button"
                onClick={() => setConfirmRestart(true)}
                className="min-h-11 rounded-full px-3 underline-offset-4 hover:text-fg hover:underline"
              >
                {t("restart")}
              </button>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}
