import "server-only";
import { z } from "zod";
import { getContent } from "@/lib/data";
import { bundledExperiments, bundledStories } from "@/lib/data/local-content";
import type { Story } from "@/lib/data/types";
import { matchStories } from "@/lib/matching/match";
import { canGenerateReport } from "@/lib/questionnaire/engine";
import { aiReportSchema, assembleReport } from "@/lib/report/ai-schema";
import { buildFallbackReport } from "@/lib/report/fallback";
import { logAIFailure } from "../log";
import { buildReportMessages, reportSystemPrompt } from "../prompts";
import { getProvider } from "../provider";
import { aiCopy } from "../server-copy";
import { toAIError } from "../types";
import { answersInput, badRequest, localeInput, looseLocale, rateLimited, readBody } from "./common";

const input = z.object({ answers: answersInput, locale: localeInput });

async function loadStories(): Promise<Story[]> {
  try {
    const stories = await getContent().listStories();
    return stories.length ? stories : bundledStories;
  } catch {
    return bundledStories;
  }
}

/** POST /api/ai/report: {answers, locale} -> {report, demo}. Any AI problem -> rule-based report. */
export async function handleReport(request: Request): Promise<Response> {
  const body = await readBody(request);
  const limited = rateLimited(request, "report", looseLocale(body));
  if (limited) return limited;
  const parsed = input.safeParse(body);
  if (!parsed.success) return badRequest(looseLocale(body));
  const { answers, locale } = parsed.data;

  const gate = canGenerateReport(answers);
  if (!gate.ok) return Response.json({ error: aiCopy(locale, "notReady"), missing: gate.missing }, { status: 422 });

  const stories = await loadStories();
  const candidates = matchStories(answers, stories, 5, locale);
  const fallback = () => Response.json({ report: buildFallbackReport(answers, locale, { stories }), demo: true });

  const provider = getProvider();
  if (provider.name === "demo") return fallback();

  try {
    const out = await provider.generateJSON(aiReportSchema, buildReportMessages({ answers, locale, candidates, experiments: bundledExperiments }), {
      system: reportSystemPrompt(locale),
      effort: "medium",
      maxTokens: 16000,
      schemaName: "discovery_report",
    });
    const report = assembleReport(out, { locale, candidateIds: candidates.map((c) => c.story.id) });
    return Response.json({ report, demo: false });
  } catch (e) {
    const err = e instanceof z.ZodError ? { kind: "schema" as const, message: "report does not match the schema" } : toAIError(e);
    await logAIFailure({ route: "report", provider: provider.name, kind: err.kind, message: err.message, locale });
    return fallback();
  }
}
