/**
 * Tiny key-value layer over localStorage with an in-memory fallback.
 * localStorage can be missing or throw (private mode, blocked site data, quota),
 * in that case values live in a Map until the page is closed and
 * `storageMode()` returns "memory" so the UI can show a notice.
 */
export const STORAGE_PREFIX = "bridge:";

export type StorageMode = "local" | "memory";

const memory = new Map<string, string>();
let degraded = false;

function backend(): Storage | null {
  // Browser only. (Reading the bare `localStorage` global on a Node server
  // prints an experimental warning, so look at `window` first.)
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readRaw(key: string): string | null {
  const k = STORAGE_PREFIX + key;
  const fromMemory = memory.get(k);
  if (fromMemory !== undefined) return fromMemory;
  const ls = backend();
  if (!ls) return null;
  try {
    return ls.getItem(k);
  } catch {
    degraded = true;
    return null;
  }
}

export function writeRaw(key: string, value: string): void {
  const k = STORAGE_PREFIX + key;
  const ls = backend();
  if (ls) {
    try {
      ls.setItem(k, value);
      memory.delete(k); // never keep a stale copy
      return;
    } catch {
      // fall through to memory
    }
  }
  degraded = true;
  memory.set(k, value);
}

export function removeRaw(key: string): void {
  const k = STORAGE_PREFIX + key;
  memory.delete(k);
  try {
    backend()?.removeItem(k);
  } catch {
    degraded = true;
  }
}

/** Removes every `bridge:` key (and nothing else) from both layers. */
export function clearAllRaw(): void {
  memory.clear();
  const ls = backend();
  if (!ls) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => ls.removeItem(k));
  } catch {
    degraded = true;
  }
}

export function readJson<T>(key: string): T | null {
  const raw = readRaw(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value));
}

/** "memory" when data cannot be persisted on this device. */
export function storageMode(): StorageMode {
  if (degraded || memory.size > 0) return "memory";
  const ls = backend();
  if (!ls) return "memory";
  try {
    const probe = STORAGE_PREFIX + "__probe";
    ls.setItem(probe, "1");
    ls.removeItem(probe);
    return "local";
  } catch {
    return "memory";
  }
}

/** Test helper: forget the in-memory copy and the degraded flag. */
export function resetStorageState(): void {
  memory.clear();
  degraded = false;
}
