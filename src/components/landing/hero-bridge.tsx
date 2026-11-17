"use client";

import { motion } from "framer-motion";

// Line drawing of a suspension bridge: two towers, a main cable, hangers, deck.
const DECK_Y = 170;
const TOWERS = [300, 900];
const CABLE = "M0 170 Q150 110 300 20 Q600 260 900 20 Q1050 110 1200 170";

function quad(a: number, c: number, b: number, t: number) {
  return (1 - t) ** 2 * a + 2 * t * (1 - t) * c + t ** 2 * b;
}

function cableY(x: number) {
  if (x < 300) return quad(170, 110, 20, x / 300);
  if (x > 900) return quad(20, 110, 170, (x - 900) / 300);
  return quad(20, 260, 20, (x - 300) / 600);
}

const HANGERS = Array.from({ length: 29 }, (_, i) => 40 + i * 40).filter(
  (x) => !TOWERS.includes(x) && DECK_Y - cableY(x) > 6,
);

const draw = (delay: number) => ({
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { duration: 1.6, delay, ease: [0.65, 0, 0.35, 1] as const },
});

export function HeroBridge() {
  return (
    <svg viewBox="0 0 1200 200" className="h-auto w-full" fill="none" aria-hidden="true">
      <motion.line x1="0" y1={DECK_Y} x2="1200" y2={DECK_Y} stroke="var(--fg)" strokeOpacity="0.5" strokeWidth="1.5" {...draw(0)} />
      {TOWERS.map((x) => (
        <motion.line key={x} x1={x} y1="12" x2={x} y2="200" stroke="var(--fg)" strokeOpacity="0.7" strokeWidth="3" {...draw(0.2)} />
      ))}
      <motion.path d={CABLE} stroke="var(--accent)" strokeWidth="1.75" {...draw(0.5)} />
      {HANGERS.map((x, i) => (
        <motion.line
          key={x}
          x1={x}
          y1={cableY(x)}
          x2={x}
          y2={DECK_Y}
          stroke="var(--fg)"
          strokeOpacity="0.25"
          strokeWidth="1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.2 + i * 0.02 }}
        />
      ))}
    </svg>
  );
}
