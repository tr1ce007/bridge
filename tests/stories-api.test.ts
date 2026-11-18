import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bundledStories } from "@/lib/data/local-content";
import { storyToRow } from "@/lib/data/supabase-store";
import { resetStorageState } from "@/lib/data/storage";

const state: { supabase: boolean; userId: string | null; inserts: { table: string; row: Record<string, unknown> }[] } = {
  supabase: false,
  userId: null,
  inserts: [],
};

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => state.supabase,
  supabasePublicEnv: () => ({ url: "http://localhost", anonKey: "anon" }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => fakeClient(),
}));

/** Records inserts; `stories` reads return the first bundled story. */
function fakeClient(): SupabaseClient {
  const story = storyToRow(bundledStories[0], null);
  return {
    auth: { getSession: async () => ({ data: { session: state.userId ? { user: { id: state.userId } } : null } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        insert: async (row: Record<string, unknown>) => {
          state.inserts.push({ table, row });
          return { error: null };
        },
        select: () => chain,
        eq: (col: string, value: unknown) => {
          if (col === "id") chain.lastId = value;
          return chain;
        },
        maybeSingle: async () => ({ data: chain.lastId === story.id ? story : null, error: null }),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

const { POST: submit } = await import("@/app/api/stories/route");
const { POST: report } = await import("@/app/api/stories/report/route");

let ip = 0;
function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  ip += 1;
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${ip}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validStory = {
  lang: "ru",
  title: "Я начал заново",
  intro: "Коротко о том, как всё было.",
  before: "Раньше я работал бухгалтером.",
  challenges: "Не хватало времени.",
  actions: "Учился по вечерам.",
  turningPoint: "Сделал первый проект.",
  now: "Работаю разработчиком.",
  advice: "Начни с малого.",
  category: "from-zero",
  anonymous: true,
  consent: true,
  locale: "ru",
};

beforeEach(() => {
  state.supabase = false;
  state.userId = null;
  state.inserts = [];
  resetStorageState();
});

describe("POST /api/stories", () => {
  it("rejects submission without consent", async () => {
    const res = await submit(post("http://x/api/stories", { ...validStory, consent: false }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("consent_required");
    expect(json.error).toContain("согласие");

    const missing = { ...validStory } as Record<string, unknown>;
    delete missing.consent;
    expect((await submit(post("http://x/api/stories", missing))).status).toBe(400);
    // a truthy string is not consent
    expect((await submit(post("http://x/api/stories", { ...validStory, consent: "true" }))).status).toBe(400);
    expect(state.inserts).toEqual([]);
  });

  it("localizes the consent error", async () => {
    const res = await submit(post("http://x/api/stories", { ...validStory, consent: false, locale: "en" }));
    expect((await res.json()).error).toMatch(/consent/i);
    const byHeader = await submit(
      post("http://x/api/stories", { ...validStory, consent: false, locale: undefined }, { "accept-language": "kk-KZ,kk;q=0.9" }),
    );
    expect((await byHeader.json()).error).toContain("келісім");
  });

  it("returns 503 in local mode and stores nothing", async () => {
    const res = await submit(post("http://x/api/stories", validStory));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe("local_mode");
    expect(json.error).toBe("Отправка историй заработает после подключения базы данных");
    expect(state.inserts).toEqual([]);
  });

  it("rejects invalid fields and non-JSON bodies", async () => {
    const res = await submit(post("http://x/api/stories", { ...validStory, title: "x", category: "nope" }));
    expect(res.status).toBe(400);
    expect((await res.json()).fields).toEqual(expect.arrayContaining(["title", "category"]));
    expect((await submit(post("http://x/api/stories", "not json"))).status).toBe(400);
    expect((await submit(post("http://x/api/stories", [1, 2]))).status).toBe(400);
    const tooLong = await submit(post("http://x/api/stories", { ...validStory, now: "я".repeat(4001) }));
    expect(tooLong.status).toBe(400);
  });

  it("a required field that is empty after sanitizing is a 400 with that field named (not a stored empty story)", async () => {
    state.supabase = true;
    state.userId = "user-1";
    for (const field of ["title", "before", "challenges", "turningPoint", "actions", "now", "intro"] as const) {
      const res = await submit(post("http://x/api/stories", { ...validStory, [field]: "<b></b><script>alert(1)</script>  " }));
      expect(res.status, field).toBe(400);
      const json = await res.json();
      expect(json.fields).toContain(field);
      expect(json.error).toBe("Проверь поля формы: часть данных не подходит.");
    }
    expect(state.inserts).toEqual([]);
  });

  it("sanitizes html", async () => {
    state.supabase = true;
    state.userId = "user-1";
    const res = await submit(
      post("http://x/api/stories", {
        ...validStory,
        title: "<b>Привет</b> мир",
        before: "Раньше <script>alert(1)</script>я работал <img src=x onerror=alert(2)>",
        advice: "<!-- hidden -->Совет​",
      }),
    );
    expect(res.status).toBe(201);
    const { table, row } = state.inserts[0];
    expect(table).toBe("stories");
    const dump = JSON.stringify(row);
    expect(dump).not.toMatch(/<\s*\/?\s*(script|b|img)/i);
    expect(dump).not.toContain("alert(1)");
    expect(dump).not.toContain("onerror");
    expect(dump).not.toContain("​");
    expect((row.content as { title: { ru: string } }).title.ru).toBe("Привет мир");
  });

  it("saves as kind user, status pending, owned by the signed-in user", async () => {
    state.supabase = true;
    state.userId = "user-1";
    const res = await submit(post("http://x/api/stories", validStory));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ status: "pending" });
    const row = state.inserts[0].row;
    expect(row).toMatchObject({ kind: "user", status: "pending", author_id: "user-1", lang: "ru" });
    expect((row.content as { categories: string[] }).categories).toEqual(["from-zero"]);
    // The insert policy requires consent_at; the route records the moment consent was given.
    expect(typeof row.consent_at).toBe("string");
    expect(Math.abs(Date.now() - Date.parse(row.consent_at as string))).toBeLessThan(5000);
    expect(row.source_url).toBeNull();
    expect(row).not.toHaveProperty("reviewed_by");
  });

  it("keeps a report reason within the 500 characters the database allows", async () => {
    state.supabase = true;
    state.userId = null;
    const id = bundledStories[0].id;
    const res = await report(post("http://x/api/stories/report", { storyId: id, reason: "inaccurate", details: "я".repeat(500) }));
    expect(res.status).toBe(201);
    const row = state.inserts.at(-1)!.row;
    expect((row.reason as string).length).toBeLessThanOrEqual(500);
  });

  it("keeps the author anonymous unless a name is given and anonymity is off", async () => {
    state.supabase = true;
    state.userId = "user-1";
    await submit(post("http://x/api/stories", { ...validStory, displayName: "Айгерим", anonymous: true }));
    expect(state.inserts[0].row.source_name).toBeNull();
    await submit(post("http://x/api/stories", { ...validStory, displayName: "Айгерим", anonymous: false }));
    expect(state.inserts[1].row.source_name).toBe("Айгерим");
  });

  it("requires sign-in in Supabase mode (anonymous inserts are blocked by RLS)", async () => {
    state.supabase = true;
    state.userId = null;
    const res = await submit(post("http://x/api/stories", validStory));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("sign_in_required");
    expect(state.inserts).toEqual([]);
  });

  it("is rate limited per client", async () => {
    const headers = { "x-forwarded-for": "10.9.9.9" };
    let last = 0;
    for (let i = 0; i < 12; i++) {
      last = (await submit(post("http://x/api/stories", { ...validStory, consent: false }, headers))).status;
    }
    expect(last).toBe(429);
  });
});

describe("POST /api/stories/report", () => {
  const id = bundledStories[0].id;

  it("returns 503 with the local-mode notice and stores nothing", async () => {
    const res = await report(post("http://x/api/stories/report", { storyId: id, reason: "spam" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Жалобы заработают после подключения базы");
    expect(state.inserts).toEqual([]);
  });

  it("creates a content_reports row in Supabase mode", async () => {
    state.supabase = true;
    state.userId = "user-2";
    const res = await report(post("http://x/api/stories/report", { storyId: id, reason: "other", details: "<b>bad</b> text" }));
    expect(res.status).toBe(201);
    expect(state.inserts[0]).toEqual({
      table: "content_reports",
      row: { reporter_id: "user-2", target_kind: "story", target_id: id, reason: "other: bad text" },
    });
  });

  it("works for signed-out visitors (reporter_id null) and rejects bad input and unknown stories", async () => {
    state.supabase = true;
    expect((await report(post("http://x/api/stories/report", { storyId: id, reason: "spam" }))).status).toBe(201);
    expect(state.inserts[0].row.reporter_id).toBeNull();
    expect((await report(post("http://x/api/stories/report", { storyId: id, reason: "bogus" }))).status).toBe(400);
    expect((await report(post("http://x/api/stories/report", { storyId: "no-such", reason: "spam" }))).status).toBe(404);
  });
});
