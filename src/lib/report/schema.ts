import { z } from "zod";

export const roadmapItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  done: z.boolean(),
});
export type RoadmapItem = z.infer<typeof roadmapItemSchema>;

const storyMatchSchema = z.object({
  storyId: z.string().min(1),
  /** Approximate closeness; never shown as a percentage. */
  relevance: z.enum(["low", "medium", "high"]),
  why: z.array(z.string()),
  differences: z.array(z.string()),
});

const directionSchema = z.object({
  name: z.string().min(1),
  why: z.string(),
  supportingAnswers: z.array(z.string()),
  difficulties: z.array(z.string()),
  skills: z.array(z.string()),
  howToTest: z.array(z.string()),
  realityCheck: z.object({
    activities: z.array(z.string()),
    misconceptions: z.array(z.string()),
    entryRoutes: z.array(z.string()),
  }),
});

export const reportSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  locale: z.enum(["ru", "kk", "en"]),
  /** true when built by the rule-based algorithm (no AI key / AI failed). */
  demo: z.boolean(),
  /** Why a demo report was built: no AI configured, or the AI call failed. Absent on AI reports. */
  demoReason: z.enum(["not-configured", "failed"]).optional(),
  startingPoint: z.string(),
  patterns: z.array(z.string()),
  unnoticed: z.array(z.string()),
  directions: z.array(directionSchema).min(5).max(8),
  stories: z.array(storyMatchSchema),
  unexpected: z.array(z.object({ name: z.string().min(1), why: z.string() })),
  experiments: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string(),
      /** Id from src/content/experiments.json when the experiment exists on /try. */
      experimentId: z.string().optional(),
    }),
  ),
  roadmap: z.object({
    d7: z.array(roadmapItemSchema),
    d30: z.array(roadmapItemSchema),
    d90: z.array(roadmapItemSchema),
  }),
});

export type DiscoveryReport = z.infer<typeof reportSchema>;
