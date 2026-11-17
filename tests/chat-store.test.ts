import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createLocalUserStore } from "@/lib/data/local-store";
import { resetStorageState, storageMode } from "@/lib/data/storage";
import { createSupabaseUserStore } from "@/lib/data/supabase-store";
import type { Conversation } from "@/lib/data/types";

function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    _data: data,
  };
}

const conv = (over: Partial<Conversation> = {}): Conversation => ({
  id: "c1",
  title: "Не знаю, чего хочу",
  messages: [
    { id: "m1", role: "user", content: "Не знаю, чего хочу", createdAt: "2026-11-17T10:00:00.000Z" },
    { id: "m2", role: "assistant", content: "Расскажи, что тебя беспокоит?", createdAt: "2026-11-17T10:00:05.000Z" },
  ],
  createdAt: "2026-11-17T10:00:00.000Z",
  updatedAt: "2026-11-17T10:00:05.000Z",
  ...over,
});

afterEach(() => vi.unstubAllGlobals());

describe("conversation methods of the local store", () => {
  let ls: ReturnType<typeof fakeLocalStorage>;
  beforeEach(() => {
    ls = fakeLocalStorage();
    vi.stubGlobal("window", { localStorage: ls });
    resetStorageState();
  });

  it("returns null when nothing is saved", async () => {
    expect(await createLocalUserStore().loadConversation()).toBeNull();
  });

  it("saves and loads a conversation under the bridge: prefix", async () => {
    const store = createLocalUserStore();
    await store.saveConversation(conv());
    expect(await store.loadConversation()).toEqual(conv());
    expect([...ls._data.keys()]).toEqual(["bridge:conversation"]);
  });

  it("saving the same id again replaces its messages; a new id replaces the conversation", async () => {
    const store = createLocalUserStore();
    await store.saveConversation(conv());
    const longer = conv({
      messages: [...conv().messages, { id: "m3", role: "user", content: "Родители хотят, чтобы я стал врачом", createdAt: "2026-11-17T10:01:00.000Z" }],
    });
    await store.saveConversation(longer);
    expect((await store.loadConversation())?.messages.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    await store.saveConversation(conv({ id: "c2", messages: [] }));
    expect((await store.loadConversation())?.id).toBe("c2");
  });

  it("clearConversations removes it and leaves other data alone", async () => {
    const store = createLocalUserStore();
    await store.saveConversation(conv());
    await store.savePreferences({ memoryConsent: true });
    await store.clearConversations();
    expect(await store.loadConversation()).toBeNull();
    expect(await store.getPreferences()).toEqual({ memoryConsent: true });
  });

  it("ignores corrupt or invalid stored data", async () => {
    ls.setItem("bridge:conversation", "{broken");
    expect(await createLocalUserStore().loadConversation()).toBeNull();
    ls.setItem("bridge:conversation", JSON.stringify({ id: "x", messages: [{ role: "system", content: "no" }] }));
    expect(await createLocalUserStore().loadConversation()).toBeNull();
  });

  it("clearAll also removes the conversation", async () => {
    const store = createLocalUserStore();
    await store.saveConversation(conv());
    await store.clearAll();
    expect(await store.loadConversation()).toBeNull();
  });

  it("memory fallback: still works when localStorage refuses writes", async () => {
    const throwing = {
      length: 0,
      key: () => null,
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("denied", "QuotaExceededError");
      },
      removeItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
      clear: () => {},
    };
    vi.stubGlobal("window", { localStorage: throwing });
    resetStorageState();
    const store = createLocalUserStore();
    await store.saveConversation(conv());
    expect(await store.loadConversation()).toEqual(conv());
    expect(storageMode()).toBe("memory");
    await store.clearConversations();
    expect(await store.loadConversation()).toBeNull();
  });
});

/** In-memory stand-in for the Supabase query builder, enough for the chat tables. */
function fakeSignedInClient() {
  const tables: Record<string, Record<string, unknown>[]> = { conversations: [], messages: [] };
  const log: string[] = [];
  function from(table: string) {
    const filters: [string, unknown][] = [];
    let inFilter: [string, unknown[]] | null = null;
    let mode: "select" | "delete" | "upsert" = "select";
    let single = false;
    let order: [string, boolean] | null = null;
    let cols = "*";
    const apply = () => {
      let rows = tables[table].filter((r) => filters.every(([k, v]) => r[k] === v) && (!inFilter || inFilter[1].includes(r[inFilter[0]])));
      if (order) rows = [...rows].sort((a, b) => String(a[order![0]]).localeCompare(String(b[order![0]])) * (order![1] ? 1 : -1));
      return rows;
    };
    const b: Record<string, unknown> = {
      select: (c: string) => ((mode = "select"), (cols = c), b),
      eq: (k: string, v: unknown) => (filters.push([k, v]), b),
      in: (k: string, v: unknown[]) => ((inFilter = [k, v]), b),
      order: (k: string, o: { ascending: boolean }) => ((order = [k, o.ascending]), b),
      limit: () => b,
      maybeSingle: () => ((single = true), b),
      delete: () => ((mode = "delete"), log.push(`delete ${table}`), b),
      upsert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        mode = "upsert";
        log.push(`upsert ${table}`);
        for (const r of Array.isArray(rows) ? rows : [rows]) {
          const i = tables[table].findIndex((x) => x.id === r.id);
          if (i >= 0) tables[table][i] = r;
          else tables[table].push(r);
        }
        return b;
      },
      then: (resolve: (v: unknown) => void) => {
        if (mode === "delete") {
          const gone = new Set(apply());
          tables[table] = tables[table].filter((r) => !gone.has(r));
          return resolve({ data: null, error: null });
        }
        if (mode === "upsert") return resolve({ data: null, error: null });
        const rows = apply();
        void cols;
        return resolve({ data: single ? (rows[0] ?? null) : rows, error: null });
      },
    };
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
    from,
  } as unknown as SupabaseClient;
  return { client, tables, log };
}

describe("conversation methods of the Supabase store", () => {
  it("writes conversations and messages and reads them back", async () => {
    resetStorageState();
    const { client, tables } = fakeSignedInClient();
    const store = createSupabaseUserStore(() => client, createLocalUserStore());
    expect(await store.loadConversation()).toBeNull();

    await store.saveConversation(conv());
    expect(tables.conversations).toHaveLength(1);
    expect(tables.conversations[0]).toMatchObject({ id: "c1", user_id: "u1", title: "Не знаю, чего хочу" });
    expect(tables.messages.map((m) => m.conversation_id)).toEqual(["c1", "c1"]);
    expect(await store.loadConversation()).toEqual(conv());
  });

  it("removes messages that are no longer in the conversation, and clears everything on request", async () => {
    resetStorageState();
    const { client, tables } = fakeSignedInClient();
    const store = createSupabaseUserStore(() => client, createLocalUserStore());
    await store.saveConversation(conv());
    await store.saveConversation(conv({ messages: [conv().messages[0]] }));
    expect(tables.messages.map((m) => m.id)).toEqual(["m1"]);
    await store.clearConversations();
    expect(tables.conversations).toEqual([]);
    expect(await store.loadConversation()).toBeNull();
  });

  it("uses the local store when nobody is signed in", async () => {
    resetStorageState();
    vi.stubGlobal("window", { localStorage: fakeLocalStorage() });
    const touched: string[] = [];
    const client = {
      auth: { getSession: async () => ({ data: { session: null } }) },
      from: (t: string) => (touched.push(t), {}),
    } as unknown as SupabaseClient;
    const store = createSupabaseUserStore(() => client, createLocalUserStore());
    await store.saveConversation(conv());
    expect(await store.loadConversation()).toEqual(conv());
    expect(touched).toEqual([]);
  });
});
