import { z } from "zod";
import type { Locale } from "@/lib/data/types";
import { reportSchema, type DiscoveryReport } from "./schema";

/**
 * What the model writes: the report content without server-owned fields (id, createdAt, locale,
 * demo) and with plain-text roadmap items (the server adds ids and `done`).
 */
export const aiReportSchema = reportSchema
  .omit({ id: true, createdAt: true, locale: true, demo: true, roadmap: true })
  .extend({
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
 * stories whose ids were among the candidates, and checks the final shape with `reportSchema`.
 * Throws on anything invalid.
 */
export function assembleReport(raw: unknown, ctx: { locale: Locale; candidateIds: string[]; id?: string; createdAt?: string }): DiscoveryReport {
  const out = aiReportSchema.parse(raw);
  const allowed = new Set(ctx.candidateIds);
  const seen = new Set<string>();
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
    roadmap: { d7: items(out.roadmap.d7), d30: items(out.roadmap.d30), d90: items(out.roadmap.d90) },
  });
}
