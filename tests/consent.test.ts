import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { turnMemoryOff, type ConsentStore } from "@/lib/chat/consent";
import { createLocalUserStore } from "@/lib/data/local-store";
import { resetStorageState } from "@/lib/data/storage";
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
  };
}

const conv: Conversation = {
  id: "c1",
  messages: [{ id: "m1", role: "user", content: "Привет", createdAt: "2026-11-17T10:00:00.000Z" }],
  createdAt: "2026-11-17T10:00:00.000Z",
  updatedAt: "2026-11-17T10:00:00.000Z",
};

describe("turnMemoryOff", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: fakeLocalStorage() });
    resetStorageState();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetStorageState();
  });

  it("clears first and saves the preference second", async () => {
    const order: string[] = [];
    const store: ConsentStore = {
      clearConversations: async () => void order.push("clear"),
      savePreferences: async () => void order.push("save"),
      getPreferences: async () => ({ memoryConsent: false }),
    };
    expect(await turnMemoryOff(store)).toEqual({ ok: true, cleared: true, prefSaved: true, consent: false });
    expect(order).toEqual(["clear", "save"]);
  });

  it("clear fails: the preference is NOT turned off, the result says so and reports what is stored", async () => {
    const local = createLocalUserStore();
    await local.savePreferences({ memoryConsent: true });
    await local.saveConversation(conv);
    const store: ConsentStore = {
      ...local,
      clearConversations: async () => {
        throw new Error("boom");
      },
      savePreferences: local.savePreferences.bind(local),
      getPreferences: local.getPreferences.bind(local),
    };
    const result = await turnMemoryOff(store);
    expect(result).toEqual({ ok: false, cleared: false, prefSaved: false, consent: true });
    expect((await local.getPreferences()).memoryConsent).toBe(true);
    expect(await local.loadConversation()).not.toBeNull();
  });

  it("save fails: the conversation is already gone, the result says the preference is unchanged", async () => {
    const local = createLocalUserStore();
    await local.savePreferences({ memoryConsent: true });
    await local.saveConversation(conv);
    const store: ConsentStore = {
      clearConversations: local.clearConversations.bind(local),
      getPreferences: local.getPreferences.bind(local),
      savePreferences: async () => {
        throw new Error("boom");
      },
    };
    const result = await turnMemoryOff(store);
    expect(result).toEqual({ ok: false, cleared: true, prefSaved: false, consent: true });
    expect(await local.loadConversation()).toBeNull();
  });

  it("reports consent as null when the stored value cannot be read back", async () => {
    const store: ConsentStore = {
      clearConversations: async () => {},
      savePreferences: async () => {},
      getPreferences: async () => {
        throw new Error("boom");
      },
    };
    expect(await turnMemoryOff(store)).toEqual({ ok: true, cleared: true, prefSaved: true, consent: null });
  });

  it("after success nothing is stored: no conversation, consent off", async () => {
    const local = createLocalUserStore();
    await local.savePreferences({ memoryConsent: true });
    await local.saveConversation(conv);
    expect(await turnMemoryOff(local)).toEqual({ ok: true, cleared: true, prefSaved: true, consent: false });
    expect(await local.loadConversation()).toBeNull();
    expect((await local.getPreferences()).memoryConsent).toBe(false);
  });
});
