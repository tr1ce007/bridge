"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * The visual motif: a thin suspension-bridge arc between two piers that
 * draws itself when scrolled into view. Purely decorative.
 */
export function BridgeLine({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>
      <svg viewBox="0 0 1200 64" preserveAspectRatio="none" className="h-10 w-full sm:h-14">
        <line x1="1" y1="8" x2="1" y2="64" stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="1199" y1="8" x2="1199" y2="64" stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="63" x2="1200" y2="63" stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <motion.path
          d="M1 8 Q600 104 1199 8"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: "0px 0px -15% 0px" }}
          transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    </div>
  );
}
