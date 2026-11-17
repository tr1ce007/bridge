import { getContent } from "@/lib/data";
import { workingRoadmap } from "./roadmap";
import type {
  DiscoveryReport,
  Experiment,
  ExperimentCompletion,
  JournalEntry,
  Opportunity,
  QuestionnaireSession,
  Roadmap,
  Story,
  UserStore,
} from "@/lib/data/types";

export interface DashboardData {
  session: QuestionnaireSession | null;
  reports: DiscoveryReport[];
  roadmap: Roadmap;
  journal: JournalEntry[];
  completions: ExperimentCompletion[];
  savedStoryIds: string[];
  savedOpportunityIds: string[];
  savedDirectionIds: string[];
  stories: Story[];
  experiments: Experiment[];
  opportunities: Opportunity[];
  /** True when some part could not be read (the page still shows the rest). */
  partial: boolean;
}

/** Reads everything the dashboard needs. A part that fails becomes empty and sets `partial`. */
export async function loadDashboard(store: UserStore, content: ReturnType<typeof getContent> = getContent()): Promise<DashboardData> {
  let partial = false;
  const safe = async <T>(read: () => Promise<T>, empty: T): Promise<T> => {
    try {
      return await read();
    } catch {
      partial = true;
      return empty;
    }
  };
  const [session, reports, roadmap, journal, completions, savedStoryIds, savedOpportunityIds, savedDirectionIds, stories, experiments, opportunities] =
    await Promise.all([
      safe(() => store.loadSession(), null),
      safe(() => store.listReports(), []),
      safe(() => store.getRoadmap(), { d7: [], d30: [], d90: [] }),
      safe(() => store.listJournal(), []),
      safe(() => store.listCompletions(), []),
      safe(() => store.listSaved("story"), []),
      safe(() => store.listSaved("opportunity"), []),
      safe(() => store.listSaved("direction"), []),
      safe(() => content.listStories(), []),
      safe(() => content.listExperiments(), []),
      safe(() => content.listOpportunities({ includeOutdated: true }), []),
    ]);
  return { session, reports, roadmap: workingRoadmap(reports, roadmap), journal, completions, savedStoryIds, savedOpportunityIds, savedDirectionIds, stories, experiments, opportunities, partial };
}
