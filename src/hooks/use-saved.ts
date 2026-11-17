"use client";

import { useCallback, useEffect, useState } from "react";
import { getUserStore, storageMode, type SavedKind } from "@/lib/data";

export type SavedStatus = "loading" | "ready" | "error";

/**
 * Saved ids of one kind from `getUserStore()` (browser or Supabase). Loads after mount.
 * `toggle` waits for the store and then updates the list; it returns false when saving failed.
 * `memoryOnly` is true when the browser blocks storage (saved items last until the tab closes).
 */
export function useSaved(kind: SavedKind) {
  const [ids, setIds] = useState<string[]>([]);
  const [status, setStatus] = useState<SavedStatus>("loading");
  const [memoryOnly, setMemoryOnly] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getUserStore()
      .listSaved(kind)
      .then((list) => {
        if (cancelled) return;
        setIds(list);
        setStatus("ready");
        setMemoryOnly(storageMode() === "memory");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const toggle = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const nowSaved = await getUserStore().toggleSaved(kind, id);
        setIds((prev) => (nowSaved ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
        setMemoryOnly(storageMode() === "memory");
        setSaveFailed(false);
        return true;
      } catch {
        setSaveFailed(true);
        return false;
      }
    },
    [kind],
  );

  return { ids, status, memoryOnly, saveFailed, toggle };
}
