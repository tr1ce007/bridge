import { z } from "zod";
import { reportSchema, roadmapItemSchema, type DiscoveryReport } from "@/lib/report/schema";

export { reportSchema, roadmapItemSchema };
export type { DiscoveryReport, RoadmapItem } from "@/lib/report/schema";

// ---------------------------------------------------------------- basics

/** Same list as `routing.locales` in src/i18n/routing.ts (checked by a test). */
export const LOCALES = ["ru", "kk", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const localeSchema = z.enum(LOCALES);

export const AXES = [
  "start",
  "interests",
  "fears",
  "education",
  "challenges",
  "motives",
  "decisions",
  "transitions",
] as const;
export type Axis = (typeof AXES)[number];

/** Text that exists in all three UI languages (experiments, opportunities). */
export const localizedTextSchema = z.object({
  ru: z.string().min(1),
  kk: z.string().min(1),
  en: z.string().min(1),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const localizedListSchema = z.object({
  ru: z.array(z.string().min(1)).min(1),
  kk: z.array(z.string().min(1)).min(1),
  en: z.array(z.string().min(1)).min(1),
});
export type LocalizedList = z.infer<typeof localizedListSchema>;

/** Story text: may exist only in the original language (user submissions). */
export const storyTextSchema = z
  .object({
    ru: z.string().min(1).optional(),
    kk: z.string().min(1).optional(),
    en: z.string().min(1).optional(),
  })
  .refine((t) => Boolean(t.ru || t.kk || t.en), "at least one language is required");
export type StoryText = z.infer<typeof storyTextSchema>;

// ---------------------------------------------------------------- user data

export const answerSchema = z.object({
  questionId: z.string().min(1),
  value: z.union([z.string(), z.array(z.string())]),
  skipped: z.boolean().optional(),
});
export type Answer = z.infer<typeof answerSchema>;

export const questionnaireSessionSchema = z.object({
  id: z.string().min(1),
  answers: z.array(answerSchema),
  currentId: z.string().nullable(),
  startedAt: z.string(),
  updatedAt: z.string(),
});
export type QuestionnaireSession = z.infer<typeof questionnaireSessionSchema>;

export const roadmapSchema = z.object({
  d7: z.array(roadmapItemSchema),
  d30: z.array(roadmapItemSchema),
  d90: z.array(roadmapItemSchema),
});
export type Roadmap = z.infer<typeof roadmapSchema>;

/** The five optional prompts of a reflection entry (all optional, an entry needs at least one filled). */
export const JOURNAL_FIELDS = ["tried", "learned", "surprised", "disliked", "next"] as const;
export type JournalField = (typeof JOURNAL_FIELDS)[number];
export const JOURNAL_FIELD_MAX = 2000;

export const journalEntrySchema = z.object({
  id: z.string().min(1),
  /** Free note. Older entries only have this; new entries leave it empty and use the five fields. */
  text: z.string(),
  /** What I tried. */
  tried: z.string().max(JOURNAL_FIELD_MAX).optional(),
  /** What I learned. */
  learned: z.string().max(JOURNAL_FIELD_MAX).optional(),
  /** What surprised me. */
  surprised: z.string().max(JOURNAL_FIELD_MAX).optional(),
  /** What I disliked. */
  disliked: z.string().max(JOURNAL_FIELD_MAX).optional(),
  /** What I want to explore next. */
  next: z.string().max(JOURNAL_FIELD_MAX).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

/** Answer to "Did you enjoy the process itself, or only the idea of doing it?" */
export const PROCESS_ANSWERS = ["process", "idea", "unsure"] as const;
export type ProcessAnswer = (typeof PROCESS_ANSWERS)[number];

export const experimentCompletionSchema = z.object({
  experimentId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  /** True only for the answer "the process". "Only the idea" and "not sure" are both false; see `answer`. */
  enjoyedProcess: z.boolean(),
  /** The exact 3-way answer. Absent in completions saved before it existed (then read `enjoyedProcess`). */
  answer: z.enum(PROCESS_ANSWERS).optional(),
  reflection: z.string(),
  completedAt: z.string(),
});
export type ExperimentCompletion = z.infer<typeof experimentCompletionSchema>;

export const preferencesSchema = z.object({
  /** Consent for the chat to remember earlier conversations. Off by default. */
  memoryConsent: z.boolean(),
});
export type Preferences = z.infer<typeof preferencesSchema>;

/**
 * Things a person can save. A `direction` id is `<reportId>:<index>` (the position of the
 * direction in that report, which never changes after the report is saved).
 */
export const SAVED_KINDS = ["story", "opportunity", "direction"] as const;
export type SavedKind = (typeof SAVED_KINDS)[number];

/** One chat turn as it is stored. `id` is a UUID (it is also the primary key in Supabase). */
export const storedMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string(),
});
export type StoredMessage = z.infer<typeof storedMessageSchema>;

/** The remembered chat conversation (only saved when the person turned memory on). */
export const conversationSchema = z.object({
  /** UUID. */
  id: z.string().min(1),
  title: z.string().optional(),
  messages: z.array(storedMessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Conversation = z.infer<typeof conversationSchema>;

// ---------------------------------------------------------------- content

export const STORY_KINDS = ["verified", "documented", "user", "demo"] as const;
export type StoryKind = (typeof STORY_KINDS)[number];
export const STORY_STATUSES = ["pending", "approved", "rejected"] as const;
export type StoryStatus = (typeof STORY_STATUSES)[number];

/** Story themes shown on /stories (spec categories). A story may have several. */
export const STORY_CATEGORIES = [
  "unsure",
  "changed-major",
  "from-zero",
  "first-job",
  "failed-restart",
  "unexpected-passion",
  "other-than-parents",
  "first-business",
  "education-journey",
  "study-abroad",
] as const;
export type StoryCategory = (typeof STORY_CATEGORIES)[number];

export const AGE_RANGES = ["under-18", "18-24", "25-34", "35-plus"] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

const tagsSchema = z.object(
  Object.fromEntries(AXES.map((a) => [a, z.array(z.string())])) as Record<
    Axis,
    z.ZodArray<z.ZodString>
  >,
);

export const storySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(STORY_KINDS),
  /** Absent in JSON content (= approved). Set by moderation in Supabase. */
  status: z.enum(STORY_STATUSES).optional(),
  title: storyTextSchema,
  /** Short lead paragraph. Optional: the bundled demo stories start straight with `before`. */
  intro: storyTextSchema.optional(),
  /** Themes (spec categories). Stored inside the `content` jsonb in Supabase. */
  categories: z.array(z.enum(STORY_CATEGORIES)).optional(),
  /** Age of the narrator when the story happened or was written (optional). Also inside `content`. */
  ageRange: z.enum(AGE_RANGES).optional(),
  /** Original language of the story. */
  lang: localeSchema,
  sourceUrl: z.string().url().optional(),
  sourceName: z.string().optional(),
  attribution: storyTextSchema,
  publishedAt: z.string().optional(),
  before: storyTextSchema,
  challenges: storyTextSchema,
  turningPoint: storyTextSchema,
  actions: storyTextSchema,
  now: storyTextSchema,
  advice: storyTextSchema.optional(),
  tags: tagsSchema,
  /** Names of fields the source did not provide (shown as "not stated"). */
  incomplete: z.array(z.string()).optional(),
});
export type Story = z.infer<typeof storySchema>;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const experimentSchema = z.object({
  id: z.string().min(1),
  /** Slug from `DIRECTIONS` (src/lib/data/directions.ts). */
  direction: z.string().min(1),
  title: localizedTextSchema,
  steps: localizedListSchema,
  timeEstimate: localizedTextSchema,
  difficulty: z.enum(DIFFICULTIES),
  resources: localizedListSchema,
  outcome: localizedTextSchema,
  reflection: localizedListSchema,
});
export type Experiment = z.infer<typeof experimentSchema>;

/** `course` = online / free course, `program` = educational programme. */
export const OPPORTUNITY_KINDS = [
  "scholarship",
  "exchange",
  "course",
  "internship",
  "volunteering",
  "conference",
  "competition",
  "fellowship",
  "program",
  "mentorship",
] as const;
export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];
export const OPPORTUNITY_LEVELS = ["bachelor", "master", "phd", "any"] as const;
export type OpportunityLevel = (typeof OPPORTUNITY_LEVELS)[number];
/** Where the programme takes place (filter "country / region"). */
export const OPPORTUNITY_COUNTRIES = [
  "kazakhstan",
  "central-asia",
  "europe",
  "germany",
  "uk",
  "usa",
  "hungary",
  "turkey",
  "online",
  "international",
] as const;
export type OpportunityCountry = (typeof OPPORTUNITY_COUNTRIES)[number];
/** Cost for the participant. `unknown` = "check the official site" (we never guess). */
export const OPPORTUNITY_COSTS = ["free", "mixed", "paid", "unknown"] as const;
export type OpportunityCost = (typeof OPPORTUNITY_COSTS)[number];
export const OPPORTUNITY_STATUSES = ["verified", "unverified", "outdated"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const opportunitySchema = z.object({
  id: z.string().min(1),
  /** Official programme name (not translated). */
  name: z.string().min(1),
  kind: z.enum(OPPORTUNITY_KINDS),
  levels: z.array(z.enum(OPPORTUNITY_LEVELS)).min(1),
  country: z.enum(OPPORTUNITY_COUNTRIES).default("international"),
  cost: z.enum(OPPORTUNITY_COSTS).default("unknown"),
  description: localizedTextSchema,
  eligibility: localizedTextSchema,
  /** Official site only. */
  url: z.string().url(),
  /** ISO date, only when checked on the official site; otherwise null. */
  deadline: z.string().nullable(),
  /** ISO date the URL was last opened and checked; null = never verified. */
  verifiedAt: z.string().nullable(),
  status: z.enum(OPPORTUNITY_STATUSES),
});
export type Opportunity = z.infer<typeof opportunitySchema>;

// ---------------------------------------------------------------- filters / inputs

export interface StoryFilter {
  kind?: StoryKind;
  lang?: Locale;
  /** Keep stories carrying this tag on this axis. */
  tag?: { axis: Axis; tag: string };
  /** Case-insensitive substring over the title. */
  q?: string;
}

export interface OpportunityFilter {
  kind?: OpportunityKind;
  level?: OpportunityLevel;
  q?: string;
  /** Outdated entries are hidden unless this is true. */
  includeOutdated?: boolean;
}

export const SUBMISSION_LIMITS = { title: 200, intro: 1000, section: 4000, advice: 2000, displayName: 60 } as const;

export const storySubmissionSchema = z.object({
  lang: localeSchema,
  title: z.string().trim().min(3).max(SUBMISSION_LIMITS.title),
  intro: z.string().trim().min(1).max(SUBMISSION_LIMITS.intro).optional(),
  category: z.enum(STORY_CATEGORIES).optional(),
  ageRange: z.enum(AGE_RANGES).optional(),
  /** Public author name; absent = anonymous. */
  displayName: z.string().trim().min(1).max(SUBMISSION_LIMITS.displayName).optional(),
  before: z.string().trim().min(1).max(SUBMISSION_LIMITS.section),
  challenges: z.string().trim().min(1).max(SUBMISSION_LIMITS.section),
  turningPoint: z.string().trim().min(1).max(SUBMISSION_LIMITS.section),
  actions: z.string().trim().min(1).max(SUBMISSION_LIMITS.section),
  now: z.string().trim().min(1).max(SUBMISSION_LIMITS.section),
  advice: z.string().trim().max(SUBMISSION_LIMITS.advice).optional(),
  tags: z.record(z.string(), z.array(z.string().max(60)).max(20)).optional(),
});
export type StorySubmission = z.infer<typeof storySubmissionSchema>;

// ---------------------------------------------------------------- store interfaces

export type StoreMode = "local" | "supabase";

export interface UserStore {
  readonly mode: StoreMode;
  loadSession(): Promise<QuestionnaireSession | null>;
  saveSession(session: QuestionnaireSession): Promise<void>;
  /** Newest first. */
  listReports(): Promise<DiscoveryReport[]>;
  /** Upsert by `id`. */
  saveReport(report: DiscoveryReport): Promise<void>;
  /** Empty roadmap when nothing is saved yet. */
  getRoadmap(): Promise<Roadmap>;
  saveRoadmap(roadmap: Roadmap): Promise<void>;
  /** Newest first. */
  listJournal(): Promise<JournalEntry[]>;
  /** Upsert by `id`. */
  saveJournal(entry: JournalEntry): Promise<void>;
  deleteJournal(id: string): Promise<void>;
  /** Returns the new state: true = now saved. */
  toggleSaved(kind: SavedKind, id: string): Promise<boolean>;
  /** Ids, in the order they were saved. */
  listSaved(kind: SavedKind): Promise<string[]>;
  /** Upsert by `experimentId`. */
  saveCompletion(completion: ExperimentCompletion): Promise<void>;
  listCompletions(): Promise<ExperimentCompletion[]>;
  /** The most recently updated conversation, or null. Messages are oldest first. */
  loadConversation(): Promise<Conversation | null>;
  /** Upsert by `id`: the stored messages become exactly `conversation.messages`. */
  saveConversation(conversation: Conversation): Promise<void>;
  /** Deletes every saved conversation of this person. */
  clearConversations(): Promise<void>;
  getPreferences(): Promise<Preferences>;
  savePreferences(prefs: Preferences): Promise<void>;
  /** Deletes all of the user's personal data (not the auth account). */
  clearAll(): Promise<void>;
}

export interface ContentStore {
  readonly mode: StoreMode;
  /** Only approved stories. */
  listStories(filter?: StoryFilter): Promise<Story[]>;
  getStory(id: string): Promise<Story | null>;
  listExperiments(): Promise<Experiment[]>;
  listOpportunities(filter?: OpportunityFilter): Promise<Opportunity[]>;
  /** Validates + sanitizes, stores as kind "user", status "pending". */
  submitStory(input: StorySubmission): Promise<{ id: string; status: "pending" }>;
}
