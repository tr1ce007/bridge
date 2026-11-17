import { z } from "zod";

/** Weeks 1 to 4, then month 2 and month 3. */
export const WHATIF_PERIODS = ["w1", "w2", "w3", "w4", "m2", "m3"] as const;
export type WhatIfPeriod = (typeof WHATIF_PERIODS)[number];

const text = z.string().min(1).max(700);

const periodSchema = z.object({
  /** Concrete things to do in this period. */
  actions: z.array(text).min(1).max(5),
  /** Small experiments to try (from the platform's list or generic small tests). */
  experiments: z.array(text).max(4),
  /** Kinds of people to talk to (roles, never made-up names). */
  people: z.array(text).max(4),
  /** What may get in the way. */
  obstacles: z.array(text).max(4),
  /** One question to ask yourself at the end of the period. */
  checkpoint: text,
});
export type WhatIfPeriodPlan = z.infer<typeof periodSchema>;

/**
 * A 3-month exploration scenario for one direction. It is a plan for exploring, not a forecast.
 * Used both for the AI answer and for the rule-based fallback.
 */
export const whatIfSchema = z.object({
  /** Name of the direction as the person knows it. */
  direction: z.string().min(1).max(200),
  periods: z.object({
    w1: periodSchema,
    w2: periodSchema,
    w3: periodSchema,
    w4: periodSchema,
    m2: periodSchema,
    m3: periodSchema,
  }),
});
export type WhatIfScenario = z.infer<typeof whatIfSchema>;
