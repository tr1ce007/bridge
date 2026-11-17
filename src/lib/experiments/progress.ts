import { z } from "zod";
import { readJson, writeJson } from "@/lib/data/storage";

/**
 * "Started, not finished yet" experiments. Kept only on this device (same storage layer as the
 * rest of local data; "Delete my data" clears it). Finished experiments live in
 * `getUserStore().listCompletions()`, which is the part that syncs to Supabase.
 */
const KEY = "experiments-started";

export function listStarted(): string[] {
  const parsed = z.array(z.string()).safeParse(readJson(KEY));
  return parsed.success ? parsed.data : [];
}

export function markStarted(id: string): string[] {
  const ids = listStarted();
  const next = ids.includes(id) ? ids : [...ids, id];
  writeJson(KEY, next);
  return next;
}

export function unmarkStarted(id: string): string[] {
  const next = listStarted().filter((x) => x !== id);
  writeJson(KEY, next);
  return next;
}
