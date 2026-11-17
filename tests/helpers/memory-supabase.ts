import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

/** Primary keys of the tables the user store writes to (used by upsert). */
const PRIMARY_KEYS: Record<string, string[]> = {
  questionnaire_sessions: ["id"],
  answers: ["session_id", "question_id"],
  discovery_reports: ["id"],
  journal_entries: ["id"],
  roadmaps: ["user_id"],
  saved_stories: ["user_id", "story_id"],
  saved_opportunities: ["user_id", "opportunity_id"],
  saved_directions: ["user_id", "direction_id"],
  experiment_completions: ["user_id", "experiment_id"],
  user_preferences: ["user_id"],
  conversations: ["id"],
  messages: ["id"],
};

/**
 * A tiny in-memory stand-in for the Supabase client: just enough query builder
 * (select / eq / in / order / limit / maybeSingle / insert / upsert / delete) for the
 * user store. Row level security is not simulated; `userId` is only the signed-in user.
 */
export function createMemorySupabase(userId: string | null) {
  const tables = new Map<string, Row[]>();
  const writes: string[] = [];
  const rows = (name: string) => {
    let t = tables.get(name);
    if (!t) tables.set(name, (t = []));
    return t;
  };

  function from(table: string) {
    let op: "select" | "insert" | "upsert" | "delete" | "update" = "select";
    let payload: Row[] = [];
    let onConflict: string[] | null = null;
    const filters: ((r: Row) => boolean)[] = [];
    let orderBy: { col: string; asc: boolean } | null = null;
    let max = Infinity;
    let single = false;
    let headCount = false;

    function run() {
      const t = rows(table);
      if (op === "insert") {
        writes.push(`insert:${table}`);
        t.push(...payload.map((r) => ({ ...r })));
        return { data: null, error: null };
      }
      if (op === "upsert") {
        writes.push(`upsert:${table}`);
        const keys = onConflict ?? PRIMARY_KEYS[table] ?? ["id"];
        for (const r of payload) {
          const i = t.findIndex((x) => keys.every((k) => x[k] === r[k]));
          if (i >= 0) t[i] = { ...t[i], ...r };
          else t.push({ ...r });
        }
        return { data: null, error: null };
      }
      if (op === "update") {
        writes.push(`update:${table}`);
        const hit = t.filter((r) => filters.every((f) => f(r)));
        for (const r of hit) Object.assign(r, payload[0]);
        return { data: hit.map((r) => ({ ...r })), error: null };
      }
      if (op === "delete") {
        writes.push(`delete:${table}`);
        const keep = t.filter((r) => !filters.every((f) => f(r)));
        const removed = t.filter((r) => filters.every((f) => f(r)));
        tables.set(table, keep);
        return { data: removed.map((r) => ({ ...r })), error: null };
      }
      let out = t.filter((r) => filters.every((f) => f(r)));
      if (orderBy) {
        const { col, asc } = orderBy;
        out = [...out].sort((a, b) => {
          const x = String(a[col] ?? "");
          const y = String(b[col] ?? "");
          return asc ? x.localeCompare(y) : y.localeCompare(x);
        });
      }
      if (headCount) return { data: null, count: out.length, error: null };
      out = out.slice(0, max).map((r) => ({ ...r }));
      return { data: single ? (out[0] ?? null) : out, error: null };
    }

    const builder: Record<string, unknown> = {
      // After update the awaited result holds the updated rows (like PostgREST); { head: true } only counts.
      select: (_columns?: string, opts?: { head?: boolean }) => {
        if (opts?.head) headCount = true;
        return builder;
      },
      insert: (r: Row | Row[]) => {
        op = "insert";
        payload = Array.isArray(r) ? r : [r];
        return builder;
      },
      upsert: (r: Row | Row[], opts?: { onConflict?: string }) => {
        op = "upsert";
        payload = Array.isArray(r) ? r : [r];
        onConflict = opts?.onConflict ? opts.onConflict.split(",") : null;
        return builder;
      },
      update: (r: Row) => {
        op = "update";
        payload = [r];
        return builder;
      },
      delete: () => {
        op = "delete";
        return builder;
      },
      is: (col: string, val: unknown) => {
        filters.push((r) => (r[col] ?? null) === val);
        return builder;
      },
      gte: (col: string, val: string) => {
        filters.push((r) => String(r[col] ?? "") >= val);
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters.push((r) => r[col] === val);
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        filters.push((r) => vals.includes(r[col]));
        return builder;
      },
      order: (col: string, o?: { ascending?: boolean }) => {
        orderBy = { col, asc: o?.ascending ?? true };
        return builder;
      },
      limit: (n: number) => {
        max = n;
        return builder;
      },
      maybeSingle: () => {
        single = true;
        return Promise.resolve(run());
      },
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  const client = {
    auth: { getSession: async () => ({ data: { session: userId ? { user: { id: userId } } : null } }) },
    from,
  } as unknown as SupabaseClient;

  return { client, tables, writes, rows };
}
