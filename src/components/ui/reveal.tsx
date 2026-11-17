"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Render as a list item so it can sit directly inside <ul>/<ol>. */
  as?: "div" | "li";
};

/**
 * Fades content up when it scrolls into view. Server HTML is always visible
 * (see useRevealOnScroll). Reduced motion is handled by <MotionProvider>.
 */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const { ref, controls } = useRevealOnScroll<HTMLDivElement & HTMLLIElement>(
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] } },
  );
  const Component = as === "li" ? motion.li : motion.div;
  return (
    <Component ref={ref} className={className} initial={false} animate={controls}>
      {children}
    </Component>
  );
}
