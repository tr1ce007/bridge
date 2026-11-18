import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createLocalUserStore } from "@/lib/data/local-store";
import { resetStorageState } from "@/lib/data/storage";
import {
  SignInRequiredError,
  createSupabaseContentStore,
  createSupabaseUserStore,
  storyFromRow,
  storyToRow,
} from "@/lib/data/supabase-store";
import { bundledStories } from "@/lib/data/local-content";

function fakeClient(userId: string | null) {
  const calls: string[] = [];
  const builder = new Proxy(
    {},
    {
      get: (_t, prop) => {
        // `await builder` resolves like an empty successful query.
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
        return (...args: unknown[]) => {
          calls.push(`${String(prop)}(${args.map((a) => JSON.stringify(a)).join(",")})`);
          return builder;
        };
      },
    },
  );
  const client = {
    auth: { getSession: async () => ({ data: { session: userId ? { user: { id: userId } } : null } }) },
    from: (table: string) => {
      calls.push(`from(${table})`);
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe("supabase adapters (no network)", () => {
  it("falls back to the local store when nobody is signed in", async () => {
    resetStorageState();
    const { client, calls } = fakeClient(null);
    const store = createSupabaseUserStore(() => client, createLocalUserStore());
    expect(store.mode).toBe("supabase");
    expect(await store.toggleSaved("story", "x")).toBe(true);
    expect(await store.listSaved("story")).toEqual(["x"]);
    expect(calls).toEqual([]); // never touched the database
    await store.clearAll();
    resetStorageState();
  });

  it("signed in: journal fields go to the fields column and directions to saved_directions", async () => {
    const { client, calls } = fakeClient("user-1");
    const store = createSupabaseUserStore(() => client, createLocalUserStore());
    await store.saveJournal({ id: "j1", text: "", tried: "Позвонил", learned: " ", createdAt: "2026-11-18T10:00:00.000Z" });
    const upsert = calls.find((c) => c.startsWith("upsert("))!;
    expect(upsert).toContain('"fields":{"tried":"Позвонил"}');
    await store.toggleSaved("direction", "report-1:2");
    expect(calls).toContain("from(saved_directions)");
    expect(calls.some((c) => c.includes('"direction_id":"report-1:2"'))).toBe(true);
    calls.length = 0;
    await store.clearAll();
    expect(calls).toContain("from(saved_directions)");
    expect(calls).toContain("from(journal_entries)");
    resetStorageState();
  });

  it("signed in: clearAll also deletes the user's own pending stories and clears the profile name", async () => {
    const { client, calls } = fakeClient("user-1");
    const store = createSupabaseUserStore(() => client, createLocalUserStore());
    await store.clearAll();
    // delete from stories ... author_id = uid AND status = 'pending' (never approved ones)
    const at = calls.indexOf("from(stories)");
    expect(at).toBeGreaterThanOrEqual(0);
    const chain = calls.slice(at, at + 4);
    expect(chain).toEqual(["from(stories)", "delete()", 'eq("author_id","user-1")', 'eq("status","pending")']);
    const p = calls.indexOf("from(profiles)");
    expect(p).toBeGreaterThanOrEqual(0);
    expect(calls.slice(p, p + 3)).toEqual(["from(profiles)", 'update({"display_name":null})', 'eq("id","user-1")']);
    resetStorageState();
  });

  it("refuses story submissions from signed-out visitors", async () => {
    const { client } = fakeClient(null);
    const content = createSupabaseContentStore(() => client);
    await expect(
      content.submitStory({
        lang: "ru",
        title: "Моя история",
        before: "a",
        challenges: "b",
        turningPoint: "c",
        actions: "d",
        now: "e",
      }),
    ).rejects.toBeInstanceOf(SignInRequiredError);
  });

  it("maps a story to a database row and back without losing data", () => {
    const story = { ...bundledStories[0], status: "approved" as const };
    const row = storyToRow(story, null);
    expect(row.kind).toBe("demo");
    expect(row.content.title).toEqual(story.title);
    const back = storyFromRow({
      id: row.id,
      kind: row.kind,
      status: row.status,
      lang: row.lang,
      source_url: row.source_url,
      source_name: row.source_name,
      attribution: row.attribution,
      published_at: row.published_at,
      content: row.content,
      tags: row.tags,
      incomplete: row.incomplete,
    });
    expect(back).toEqual(story);
  });

  it("ignores rows that do not match the schema", () => {
    expect(
      storyFromRow({
        id: "bad",
        kind: "demo",
        status: "approved",
        lang: "ru",
        source_url: null,
        source_name: null,
        attribution: { ru: "x" },
        published_at: null,
        content: {} as never,
        tags: {} as never,
        incomplete: null,
      }),
    ).toBeNull();
  });
});
