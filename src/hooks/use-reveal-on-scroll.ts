"use client";

import { useAnimationControls, useInView, type TargetAndTransition } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Scroll-reveal that never hides content in server HTML.
 *
 * The element renders in its final, visible state (use `initial={false}` and
 * `animate={controls}`). After hydration, only elements that are still below
 * the viewport are switched to `hidden` (off-screen, so nothing flashes) and
 * animated to `shown` once they scroll into view. Without JS, everything is
 * simply visible.
 */
export function useRevealOnScroll<T extends Element>(hidden: TargetAndTransition, shown: TargetAndTransition) {
  const ref = useRef<T>(null);
  const controls = useAnimationControls();
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const armed = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight) {
      armed.current = true;
      controls.set(hidden);
    }
    // Runs once after mount; hidden is a static style object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls]);

  useEffect(() => {
    if (inView && armed.current) {
      armed.current = false;
      controls.start(shown);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, controls]);

  return { ref, controls };
}
