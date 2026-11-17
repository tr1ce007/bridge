import "server-only";
import { z } from "zod";
import { getQuestion } from "@/lib/questionnaire/bank";
import { followUpId, followUpSource, isFollowUpId } from "@/lib/questionnaire/engine";
import { MAX_FOLLOW_UPS } from "@/lib/questionnaire/follow-up";
import { logAIFailure } from "../log";
import { buildFollowUpMessages, followUpSystemPrompt } from "../prompts";
import { getProvider } from "../provider";
import { toAIError } from "../types";
import { answersInput, badRequest, localeInput, looseLocale, rateLimited, readBody } from "./common";

const input = z.object({ answers: answersInput, locale: localeInput, questionId: z.string().min(1).max(40) });
const followUpSchema = z.object({ ask: z.boolean(), question: z.string().max(300) });

const none = () => Response.json({ followUp: null });

/**
 * POST /api/ai/followup: {answers, locale, questionId} -> {followUp: {question} | null}.
 * Asks at most one follow-up per block and never more than the engine's MAX_FOLLOW_UPS in total
 * (the client-side engine cap stays authoritative). Demo mode or any error -> null.
 */
export async function handleFollowUp(request: Request): Promise<Response> {
  const body = await readBody(request);
  const limited = rateLimited(request, "followup", looseLocale(body));
  if (limited) return limited;
  const parsed = input.safeParse(body);
  if (!parsed.success) return badRequest(looseLocale(body));
  const { answers, locale, questionId } = parsed.data;

  const provider = getProvider();
  if (provider.name === "demo") return none();

  const q = getQuestion(questionId);
  const answer = answers.find((a) => a.questionId === questionId);
  if (!q || q.type !== "text" || !answer || answer.skipped || typeof answer.value !== "string" || !answer.value.trim()) return none();
  const followUps = answers.filter((a) => isFollowUpId(a.questionId));
  if (followUps.length >= MAX_FOLLOW_UPS) return none();
  if (followUps.some((a) => a.questionId === followUpId(questionId) || getQuestion(followUpSource(a.questionId))?.block === q.block)) return none();

  try {
    const out = await provider.generateJSON(followUpSchema, buildFollowUpMessages(answers, locale, questionId), {
      system: followUpSystemPrompt(locale),
      effort: "low",
      maxTokens: 2000,
      schemaName: "follow_up",
    });
    const parsedOut = followUpSchema.parse(out);
    const question = parsedOut.question.trim();
    return parsedOut.ask && question ? Response.json({ followUp: { question } }) : none();
  } catch (e) {
    const err = toAIError(e);
    await logAIFailure({ route: "followup", provider: provider.name, kind: err.kind, message: err.message, locale });
    return none();
  }
}
