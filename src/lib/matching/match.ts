import type { Answer, Axis, Locale, Story } from "@/lib/data/types";
import { answersToTags } from "./answer-tags";
import { AXIS_DIFF, AXIS_WHY, tagLabel, tri } from "./tag-labels";

export type Relevance = "low" | "medium" | "high";

export interface StoryMatch {
  story: Story;
  relevance: Relevance;
  /** Short localized lines: what the story has in common with the person. */
  why: string[];
  /** Short localized lines: how the story's situation differs. */
  differences: string[];
}

/**
 * Axis weights. "People like me" means similar circumstances first (where you start, what is
 * hard, what you fear, which transition you are in), and only then similar interests.
 */
export const AXIS_WEIGHTS: Record<Axis, number> = {
  start: 3,
  challenges: 2.5,
  fears: 2,
  transitions: 2,
  education: 1.5,
  decisions: 1,
  motives: 1,
  interests: 1,
};

const CIRCUMSTANCE_AXES: readonly Axis[] = ["start", "challenges", "fears", "transitions"];
/** Order in which explanation lines are listed (most telling first). */
const EXPLAIN_ORDER: readonly Axis[] = ["start", "challenges", "fears", "transitions", "education", "interests", "motives", "decisions"];

const HIGH_SCORE = 9;
const MEDIUM_SCORE = 4;

function relevanceOf(score: number, circumstanceAxes: number): Relevance {
  if (score >= HIGH_SCORE && circumstanceAxes >= 2) return "high";
  if (score >= MEDIUM_SCORE) return "medium";
  return "low";
}

/**
 * Ranks stories by weighted tag overlap with the answers. Returns at most `n` stories that share
 * at least one tag, best first (ties keep the input order). Relevance is a category, never a number
 * shown to the person.
 */
export function matchStories(answers: Answer[], stories: Story[], n = 5, locale: Locale = "ru"): StoryMatch[] {
  const mine = answersToTags(answers);
  const scored = stories.map((story, index) => {
    let score = 0;
    let circumstanceAxes = 0;
    const shared: Partial<Record<Axis, string[]>> = {};
    const theirsOnly: Partial<Record<Axis, string[]>> = {};
    for (const axis of EXPLAIN_ORDER) {
      const theirs = story.tags[axis] ?? [];
      const common = theirs.filter((t) => mine[axis].includes(t));
      if (common.length) {
        shared[axis] = common;
        score += common.length * AXIS_WEIGHTS[axis];
        if (CIRCUMSTANCE_AXES.includes(axis)) circumstanceAxes += 1;
      }
      // A difference is only worth naming where the person told us something on that axis.
      const other = theirs.filter((t) => !mine[axis].includes(t));
      if (other.length && mine[axis].length) theirsOnly[axis] = other;
    }
    return { story, index, score, circumstanceAxes, shared, theirsOnly };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, n)
    .map((s) => ({
      story: s.story,
      relevance: relevanceOf(s.score, s.circumstanceAxes),
      why: lines(s.shared, AXIS_WHY, locale, 3),
      differences: lines(s.theirsOnly, AXIS_DIFF, locale, 2),
    }));
}

function lines(
  byAxis: Partial<Record<Axis, string[]>>,
  prefixes: typeof AXIS_WHY,
  locale: Locale,
  max: number,
): string[] {
  const out: string[] = [];
  for (const axis of EXPLAIN_ORDER) {
    const tags = byAxis[axis];
    if (!tags?.length) continue;
    out.push(`${tri(prefixes[axis], locale)}: ${tags.map((t) => tagLabel(axis, t, locale)).join(", ")}`);
    if (out.length >= max) break;
  }
  return out;
}
