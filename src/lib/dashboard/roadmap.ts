import type { DiscoveryReport, Roadmap, UserStore } from "@/lib/data/types";

/**
 * Saves the working roadmap and mirrors it into the newest report, the same rule as the report
 * page (an older report keeps its own plan), so the two screens never show different plans.
 */
export async function saveWorkingRoadmap(store: UserStore, roadmap: Roadmap): Promise<void> {
  await store.saveRoadmap(roadmap);
  const [latest] = await store.listReports(); // newest first
  if (latest) await store.saveReport({ ...latest, roadmap });
}

/**
 * The plan the person works with: the newest report's plan (the same one the report page edits),
 * or the stored roadmap when there is no report yet. `reports` is newest first.
 */
export function workingRoadmap(reports: DiscoveryReport[], stored: Roadmap): Roadmap {
  return reports[0]?.roadmap ?? stored;
}

export async function loadWorkingRoadmap(store: UserStore): Promise<Roadmap> {
  return workingRoadmap(await store.listReports(), await store.getRoadmap());
}
