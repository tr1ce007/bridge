import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSubmittedStory, filterOpportunities, filterStories } from "./content-utils";
import {
  experimentSchema,
  opportunitySchema,
  reportSchema,
  roadmapSchema,
  storySchema,
  type ContentStore,
  type Experiment,
  type ExperimentCompletion,
  type JournalEntry,
  type Opportunity,
  type Preferences,
  type Roadmap,
  type SavedKind,
  type Story,
  type UserStore,
} from "./types";

type GetClient = () => SupabaseClient;

export class SignInRequiredError extends Error {
  constructor() {
    super("SIGN_IN_REQUIRED");
    this.name = "SignInRequiredError";
  }
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function checkList<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  return check(res) ?? [];
}

async function currentUserId(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}

const SAVED = {
  story: { table: "saved_stories", column: "story_id" },
  opportunity: { table: "saved_opportunities", column: "opportunity_id" },
} as const satisfies Record<SavedKind, { table: string; column: string }>;

/** Tables that hold one user's personal rows (cascade covers answers/messages). */
const USER_TABLES = [
  "questionnaire_sessions",
  "discovery_reports",
  "roadmaps",
  "journal_entries",
  "saved_stories",
  "saved_opportunities",
  "experiment_completions",
  "conversations",
  "user_preferences",
] as const;

type Ops = Omit<UserStore, "mode">;
type SignedInOps = {
  [K in keyof Ops]: Ops[K] extends (...args: infer A) => infer R
    ? (client: SupabaseClient, uid: string, ...args: A) => R
    : never;
};

const signedIn: SignedInOps = {
  async loadSession(c, uid) {
    const row = check(
      await c
        .from("questionnaire_sessions")
        .select("id,current_id,started_at,updated_at")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    if (!row) return null;
    const answers = checkList(
      await c
        .from("answers")
        .select("question_id,value,skipped")
        .eq("session_id", row.id)
        .order("position", { ascending: true }),
    );
    return {
      id: row.id,
      currentId: row.current_id,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      answers: answers.map((a: { question_id: string; value: string | string[]; skipped: boolean }) => ({
        questionId: a.question_id,
        value: a.value,
        ...(a.skipped ? { skipped: true } : {}),
      })),
    };
  },
  async saveSession(c, uid, s) {
    check(
      await c.from("questionnaire_sessions").upsert({
        id: s.id,
        user_id: uid,
        current_id: s.currentId,
        started_at: s.startedAt,
        updated_at: s.updatedAt,
      }),
    );
    if (s.answers.length) {
      check(
        await c.from("answers").upsert(
          s.answers.map((a, position) => ({
            session_id: s.id,
            question_id: a.questionId,
            value: a.value,
            skipped: a.skipped ?? false,
            position,
          })),
        ),
      );
    }
    const existing = checkList(await c.from("answers").select("question_id").eq("session_id", s.id));
    const keep = new Set(s.answers.map((a) => a.questionId));
    const removed = existing
      .map((r: { question_id: string }) => r.question_id)
      .filter((q: string) => !keep.has(q));
    if (removed.length) {
      check(await c.from("answers").delete().eq("session_id", s.id).in("question_id", removed));
    }
  },

  async listReports(c, uid) {
    const rows = checkList(
      await c.from("discovery_reports").select("data").eq("user_id", uid).order("created_at", { ascending: false }),
    );
    return rows.flatMap((r: { data: unknown }) => {
      const p = reportSchema.safeParse(r.data);
      return p.success ? [p.data] : [];
    });
  },
  async saveReport(c, uid, report) {
    const r = reportSchema.parse(report);
    check(
      await c.from("discovery_reports").upsert({
        id: r.id,
        user_id: uid,
        locale: r.locale,
        demo: r.demo,
        data: r,
        created_at: r.createdAt,
      }),
    );
  },

  async getRoadmap(c, uid) {
    const row = check(await c.from("roadmaps").select("data").eq("user_id", uid).maybeSingle());
    const p = roadmapSchema.safeParse(row?.data);
    return p.success ? p.data : ({ d7: [], d30: [], d90: [] } satisfies Roadmap);
  },
  async saveRoadmap(c, uid, roadmap) {
    check(
      await c.from("roadmaps").upsert({
        user_id: uid,
        data: roadmapSchema.parse(roadmap),
        updated_at: new Date().toISOString(),
      }),
    );
  },

  async listJournal(c, uid) {
    const rows = checkList(
      await c
        .from("journal_entries")
        .select("id,text,created_at,updated_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
    );
    return rows.map(
      (r: { id: string; text: string; created_at: string; updated_at: string | null }): JournalEntry => ({
        id: r.id,
        text: r.text,
        createdAt: r.created_at,
        ...(r.updated_at ? { updatedAt: r.updated_at } : {}),
      }),
    );
  },
  async saveJournal(c, uid, e) {
    check(
      await c.from("journal_entries").upsert({
        id: e.id,
        user_id: uid,
        text: e.text,
        created_at: e.createdAt,
        updated_at: e.updatedAt ?? null,
      }),
    );
  },
  async deleteJournal(c, uid, id) {
    check(await c.from("journal_entries").delete().eq("user_id", uid).eq("id", id));
  },

  async toggleSaved(c, uid, kind, id) {
    const { table, column } = SAVED[kind];
    const found = check(await c.from(table).select(column).eq("user_id", uid).eq(column, id).maybeSingle());
    if (found) {
      check(await c.from(table).delete().eq("user_id", uid).eq(column, id));
      return false;
    }
    check(await c.from(table).insert({ user_id: uid, [column]: id }));
    return true;
  },
  async listSaved(c, uid, kind) {
    const { table, column } = SAVED[kind];
    const rows = checkList(
      await c.from(table).select(column).eq("user_id", uid).order("created_at", { ascending: true }),
    );
    return (rows as unknown as Record<string, string>[]).map((r) => r[column]);
  },

  async saveCompletion(c, uid, x) {
    check(
      await c.from("experiment_completions").upsert(
        {
          user_id: uid,
          experiment_id: x.experimentId,
          rating: x.rating,
          enjoyed_process: x.enjoyedProcess,
          reflection: x.reflection,
          completed_at: x.completedAt,
        },
        { onConflict: "user_id,experiment_id" },
      ),
    );
  },
  async listCompletions(c, uid) {
    const rows = checkList(
      await c
        .from("experiment_completions")
        .select("experiment_id,rating,enjoyed_process,reflection,completed_at")
        .eq("user_id", uid)
        .order("completed_at", { ascending: false }),
    );
    return rows.map(
      (r: {
        experiment_id: string;
        rating: number;
        enjoyed_process: boolean;
        reflection: string;
        completed_at: string;
      }): ExperimentCompletion => ({
        experimentId: r.experiment_id,
        rating: r.rating,
        enjoyedProcess: r.enjoyed_process,
        reflection: r.reflection,
        completedAt: r.completed_at,
      }),
    );
  },

  async getPreferences(c, uid) {
    const row = check(await c.from("user_preferences").select("memory_consent").eq("user_id", uid).maybeSingle());
    return { memoryConsent: row?.memory_consent ?? false } satisfies Preferences;
  },
  async savePreferences(c, uid, p) {
    check(
      await c.from("user_preferences").upsert({
        user_id: uid,
        memory_consent: p.memoryConsent,
        updated_at: new Date().toISOString(),
      }),
    );
  },

  async clearAll(c, uid) {
    for (const table of USER_TABLES) {
      check(await c.from(table).delete().eq("user_id", uid));
    }
  },
};

/**
 * Personal data in Supabase (RLS: each row visible to its owner only).
 * When nobody is signed in the calls go to `guestStore` (local storage), so a
 * visitor can still use the product as a guest.
 */
export function createSupabaseUserStore(getClient: GetClient, guestStore: UserStore): UserStore {
  const store: Record<string, unknown> = { mode: "supabase" };
  for (const name of Object.keys(signedIn) as (keyof Ops)[]) {
    store[name] = async (...args: unknown[]) => {
      const client = getClient();
      const uid = await currentUserId(client);
      const guestFn = guestStore[name] as (...a: unknown[]) => Promise<unknown>;
      if (!uid) return guestFn.apply(guestStore, args);
      const fn = signedIn[name] as (c: SupabaseClient, u: string, ...a: unknown[]) => Promise<unknown>;
      const result = await fn(client, uid, ...args);
      // "Delete my data" must also wipe anything kept on this device.
      if (name === "clearAll") await guestStore.clearAll();
      return result;
    };
  }
  return store as unknown as UserStore;
}

// ---------------------------------------------------------------- content

interface StoryRow {
  id: string;
  kind: Story["kind"];
  status: Story["status"];
  lang: Story["lang"];
  source_url: string | null;
  source_name: string | null;
  attribution: Story["attribution"];
  published_at: string | null;
  content: Pick<Story, "title" | "before" | "challenges" | "turningPoint" | "actions" | "now" | "advice">;
  tags: Story["tags"];
  incomplete: string[] | null;
}

export function storyFromRow(r: StoryRow): Story | null {
  const parsed = storySchema.safeParse({
    id: r.id,
    kind: r.kind,
    status: r.status,
    lang: r.lang,
    ...(r.source_url ? { sourceUrl: r.source_url } : {}),
    ...(r.source_name ? { sourceName: r.source_name } : {}),
    attribution: r.attribution,
    ...(r.published_at ? { publishedAt: r.published_at } : {}),
    ...r.content,
    tags: r.tags,
    ...(r.incomplete?.length ? { incomplete: r.incomplete } : {}),
  });
  return parsed.success ? parsed.data : null;
}

export function storyToRow(s: Story, authorId: string | null) {
  return {
    id: s.id,
    kind: s.kind,
    status: s.status ?? "pending",
    lang: s.lang,
    author_id: authorId,
    source_url: s.sourceUrl ?? null,
    source_name: s.sourceName ?? null,
    attribution: s.attribution,
    published_at: s.publishedAt ?? null,
    content: {
      title: s.title,
      before: s.before,
      challenges: s.challenges,
      turningPoint: s.turningPoint,
      actions: s.actions,
      now: s.now,
      ...(s.advice ? { advice: s.advice } : {}),
    },
    tags: s.tags,
    incomplete: s.incomplete ?? [],
  };
}

/** Content from Supabase tables (public read for approved stories and opportunities). */
export function createSupabaseContentStore(getClient: GetClient): ContentStore {
  async function approvedStories(): Promise<Story[]> {
    const rows = checkList(await getClient().from("stories").select("*").eq("status", "approved"));
    return (rows as StoryRow[]).flatMap((r) => {
      const s = storyFromRow(r);
      return s ? [s] : [];
    });
  }
  return {
    mode: "supabase",
    async listStories(filter) {
      return filterStories(await approvedStories(), filter);
    },
    async getStory(id) {
      const row = check(
        await getClient().from("stories").select("*").eq("id", id).eq("status", "approved").maybeSingle(),
      );
      return row ? storyFromRow(row as StoryRow) : null;
    },
    async listExperiments() {
      const rows = checkList(await getClient().from("experiments").select("*").eq("published", true));
      return (rows as { id: string; direction: string; difficulty: string; content: object }[]).flatMap(
        (r): Experiment[] => {
          const p = experimentSchema.safeParse({ id: r.id, direction: r.direction, difficulty: r.difficulty, ...r.content });
          return p.success ? [p.data] : [];
        },
      );
    },
    async listOpportunities(filter) {
      const rows = checkList(await getClient().from("opportunities").select("*"));
      const list = (
        rows as {
          id: string;
          name: string;
          kind: string;
          levels: string[];
          description: unknown;
          eligibility: unknown;
          url: string;
          deadline: string | null;
          verified_at: string | null;
          status: string;
        }[]
      ).flatMap((r): Opportunity[] => {
        const p = opportunitySchema.safeParse({
          id: r.id,
          name: r.name,
          kind: r.kind,
          levels: r.levels,
          description: r.description,
          eligibility: r.eligibility,
          url: r.url,
          deadline: r.deadline,
          verifiedAt: r.verified_at,
          status: r.status,
        });
        return p.success ? [p.data] : [];
      });
      return filterOpportunities(list, filter);
    },
    async submitStory(input) {
      const client = getClient();
      const uid = await currentUserId(client);
      if (!uid) throw new SignInRequiredError();
      const id = crypto.randomUUID();
      const story = buildSubmittedStory(input, id);
      check(await client.from("stories").insert(storyToRow(story, uid)));
      return { id, status: "pending" };
    },
  };
}
