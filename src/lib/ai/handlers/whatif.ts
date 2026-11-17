import "server-only";
import { z } from "zod";
import { bundledExperiments } from "@/lib/data/local-content";
import { catalogueIdFor } from "@/lib/report/compare";
import { getDirection } from "@/lib/report/directions";
import { buildFallbackScenario } from "@/lib/whatif/fallback";
import { whatIfSchema } from "@/lib/whatif/schema";
import { logAIFailure } from "../log";
import { buildWhatIfMessages, whatIfSystemPrompt } from "../prompts";
import { getProvider } from "../provider";
import { toAIError } from "../types";
import { answersInput, badRequest, localeInput, looseLocale, rateLimited, readBody } from "./common";

const short = z.string().max(400);

const input = z.object({
  locale: localeInput,
  direction: z.object({
    /** Catalogue id when the person picked from the catalogue. */
    key: z.string().max(60).optional(),
    name: z.string().trim().min(1).max(160),
    why: z.string().max(800).optional(),
    howToTest: z.array(short).max(8).optional(),
    skills: z.array(short).max(8).optional(),
    difficulties: z.array(short).max(8).optional(),
  }),
  /** Free text the person added (embedded only as data). */
  note: z.string().max(600).optional(),
  /** Questionnaire answers, when the person has them (they only shape the profile summary). */
  answers: answersInput.optional(),
});

/**
 * POST /api/ai/what-if: {direction, locale, note?, answers?} -> {scenario, demo, fallbackReason?}.
 * Rate limit first, then validation. No AI configured -> rule-based scenario ("not-configured");
 * any AI problem (error, timeout, invalid JSON, schema mismatch) -> rule-based scenario ("failed").
 */
export async function handleWhatIf(request: Request): Promise<Response> {
  const limited = rateLimited(request, "whatif");
  if (limited) return limited;
  const body = await readBody(request);
  const parsed = input.safeParse(body);
  if (!parsed.success) return badRequest(looseLocale(body));
  const { locale, direction, note, answers } = parsed.data;

  const catalogueId = catalogueIdFor(direction.key ?? "") ?? catalogueIdFor(direction.name);
  const fallback = (reason: "not-configured" | "failed") => ({
    scenario: { ...buildFallbackScenario(catalogueId ?? direction.name, locale, direction), direction: direction.name },
    demo: true,
    fallbackReason: reason,
  });

  const provider = getProvider();
  if (provider.name === "demo") return Response.json(fallback("not-configured"));

  const experiments = (catalogueId ? getDirection(catalogueId)?.experimentIds ?? [] : []).flatMap((id) => {
    const e = bundledExperiments.find((x) => x.id === id);
    return e ? [e.title[locale]] : [];
  });

  try {
    const out = await provider.generateJSON(whatIfSchema, buildWhatIfMessages({ locale, direction, experiments, note, answers }), {
      system: whatIfSystemPrompt(locale),
      effort: "medium",
      maxTokens: 8000,
      timeoutMs: 45_000, // route maxDuration is 60 s: leave time for the fallback
      schemaName: "what_if",
    });
    const scenario = whatIfSchema.parse(out); // never trust the provider
    return Response.json({ scenario: { ...scenario, direction: direction.name }, demo: false });
  } catch (e) {
    const err = e instanceof z.ZodError ? { kind: "schema" as const, message: "scenario does not match the schema" } : toAIError(e);
    await logAIFailure({ route: "whatif", provider: provider.name, kind: err.kind, message: err.message, locale });
    return Response.json(fallback("failed"));
  }
}
