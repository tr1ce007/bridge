import { z } from "zod";
import type { Locale } from "@/lib/data/types";
import { bundledExperiments } from "@/lib/data/local-content";
import { reportSchema, type DiscoveryReport } from "./schema";

/**
 * What the model writes: the report content without server-owned fields (id, createdAt, locale,
 * demo) and with plain-text roadmap items (the server adds ids and `done`).
 */
export const aiReportSchema = reportSchema
  .omit({ id: true, createdAt: true, locale: true, demo: true, demoReason: true, roadmap: true })
  .extend({
    /** 1–2 unexpected directions (more are cut by `assembleReport`). */
    unexpected: z.array(z.object({ name: z.string().min(1), why: z.string() })).min(1),
    roadmap: z.object({
      d7: z.array(z.string().min(1)).max(6),
      d30: z.array(z.string().min(1)).max(6),
      d90: z.array(z.string().min(1)).max(6),
    }),
  });
export type AIReport = z.infer<typeof aiReportSchema>;

let seq = 0;
function newReportId(): string {
  seq += 1;
  return `report-${Date.now().toString(36)}-${seq.toString(36)}`;
}

/**
 * Turns model output into a stored report. Validates again (never trust the provider), keeps only
 * stories whose ids were among the candidates and experiment ids that exist in experiments.json,
 * cuts "unexpected" to at most 2, and checks the final shape with `reportSchema`.
 * Throws on anything invalid.
 */
export function assembleReport(
  raw: unknown,
  ctx: { locale: Locale; candidateIds: string[]; experimentIds?: string[]; id?: string; createdAt?: string },
): DiscoveryReport {
  const out = aiReportSchema.parse(raw);
  const allowed = new Set(ctx.candidateIds);
  const seen = new Set<string>();
  const experimentIds = new Set(ctx.experimentIds ?? bundledExperiments.map((e) => e.id));
  const id = ctx.id ?? newReportId();
  let n = 0;
  const items = (list: string[]) => list.map((text) => ({ id: `${id}-rm${(n += 1)}`, text: text.trim(), done: false }));
  return reportSchema.parse({
    ...out,
    id,
    createdAt: ctx.createdAt ?? new Date().toISOString(),
    locale: ctx.locale,
    demo: false,
    stories: out.stories.filter((s) => allowed.has(s.storyId) && !seen.has(s.storyId) && seen.add(s.storyId)),
    unexpected: out.unexpected.slice(0, 2),
    // An experimentId is kept only when it exists on /try; the experiment itself stays.
    experiments: out.experiments.map(({ experimentId, ...e }) => (experimentId && experimentIds.has(experimentId) ? { ...e, experimentId } : e)),
    roadmap: { d7: items(out.roadmap.d7), d30: items(out.roadmap.d30), d90: items(out.roadmap.d90) },
  });
}
