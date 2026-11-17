import { z } from "zod";
import stories from "@/content/stories.json";
import experiments from "@/content/experiments.json";
import opportunities from "@/content/opportunities.json";
import { buildSubmittedStory, filterOpportunities, filterStories } from "./content-utils";
import { readJson, writeJson } from "./storage";
import {
  experimentSchema,
  opportunitySchema,
  storySchema,
  type ContentStore,
} from "./types";

const SUBMITTED_KEY = "submitted-stories";

export const bundledStories = z.array(storySchema).parse(stories);
export const bundledExperiments = z.array(experimentSchema).parse(experiments);
export const bundledOpportunities = z.array(opportunitySchema).parse(opportunities);

/**
 * Content from the JSON files in src/content. Works on server and client.
 * Stories submitted in local mode are kept on this device, pending, and are
 * not listed publicly (there is no moderator on a single device).
 */
export function createLocalContentStore(): ContentStore {
  return {
    mode: "local",
    async listStories(filter) {
      return filterStories(
        bundledStories.filter((s) => (s.status ?? "approved") === "approved"),
        filter,
      );
    },
    async getStory(id) {
      return bundledStories.find((s) => s.id === id && (s.status ?? "approved") === "approved") ?? null;
    },
    async listExperiments() {
      return bundledExperiments;
    },
    async listOpportunities(filter) {
      return filterOpportunities(bundledOpportunities, filter);
    },
    async submitStory(input) {
      const id = `local-${crypto.randomUUID()}`;
      const story = buildSubmittedStory(input, id);
      const existing = readJson<unknown[]>(SUBMITTED_KEY);
      writeJson(SUBMITTED_KEY, [...(Array.isArray(existing) ? existing : []), story]);
      return { id, status: "pending" };
    },
  };
}
