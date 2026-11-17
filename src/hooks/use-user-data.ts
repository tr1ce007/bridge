"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LoadState<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

/**
 * Runs `load` after mount and keeps the result. `reload()` runs it again (without flashing the
 * loading state). `load` must be stable (wrap in useCallback or define outside the component).
 */
export function useLoad<T>(load: () => Promise<T>): { state: LoadState<T>; reload: () => void } {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const alive = useRef(true);
  const seq = useRef(0);

  const run = useCallback(() => {
    const mine = (seq.current += 1);
    load()
      .then((data) => {
        if (alive.current && mine === seq.current) setState({ status: "ready", data });
      })
      .catch(() => {
        if (alive.current && mine === seq.current) setState({ status: "error" });
      });
  }, [load]);

  useEffect(() => {
    alive.current = true;
    run();
    return () => {
      alive.current = false;
    };
  }, [run]);

  return { state, reload: run };
}
