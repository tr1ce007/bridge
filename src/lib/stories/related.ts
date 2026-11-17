import { AXES, type Axis, type Story } from "@/lib/data/types";

/** The (axis, tag) pairs two stories share, in axis order. */
export function sharedTags(a: Story, b: Story): { axis: Axis; tag: string }[] {
  const out: { axis: Axis; tag: string }[] = [];
  for (const axis of AXES) {
    const other = new Set(b.tags[axis] ?? []);
    for (const tag of a.tags[axis] ?? []) if (other.has(tag)) out.push({ axis, tag });
  }
  return out;
}

/** Number of (axis, tag) pairs two stories share. */
export function sharedTagCount(a: Story, b: Story): number {
  return sharedTags(a, b).length;
}

/** Up to `limit` other stories sharing at least one tag, most shared first (ties keep list order). */
export function relatedStories(story: Story, all: Story[], limit = 3): Story[] {
  return all
    .filter((s) => s.id !== story.id)
    .map((s, i) => ({ s, i, n: sharedTagCount(story, s) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.s);
}
