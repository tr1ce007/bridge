"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** The page counts as "at the bottom" when the end marker is no more than this far below the viewport. */
const NEAR_PX = 160;

/**
 * Keeps the newest text in view while the answer streams, unless the person has scrolled up
 * (then `away` becomes true so a "jump to latest" button can appear).
 * Scrolls are `instant`: the site sets `scroll-behavior: smooth`, and a smooth scroll restarted on every
 * chunk never arrives and looks like the person scrolling up.
 */
export function useAutoScroll(trigger: unknown, enabled: boolean) {
  const endRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [away, setAway] = useState(false);

  const scrollToEnd = useCallback(() => {
    pinned.current = true;
    setAway(false);
    endRef.current?.scrollIntoView({ block: "end", behavior: "instant" });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const end = endRef.current;
      if (!end) return;
      const near = end.getBoundingClientRect().top - window.innerHeight < NEAR_PX;
      pinned.current = near;
      setAway(!near);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (enabled && pinned.current) endRef.current?.scrollIntoView({ block: "end", behavior: "instant" });
  }, [trigger, enabled]);

  return { endRef, away, scrollToEnd };
}
