import type { CSSProperties } from "react";

// Architectural line drawing of a suspension bridge: two towers, a main cable, hangers and the deck,
// with an anchor point at each bank ("today" on the left, "tomorrow" on the right).
// The intro animation is pure CSS (.draw / .fade-in / .traveler in globals.css), gated by
// the `js` class on <html>, so the drawing is fully visible in server HTML.
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

const HANGERS = Array.from({ length: 59 }, (_, i) => 20 + i * 20).filter(
  (x) => !TOWERS.includes(x) && DECK_Y - cableY(x) > 6,
);

/** Stroke width that grows on narrow screens (see .hero-bridge in globals.css), so the drawing stays legible. */
const sw = (w: number) => `calc(${w}px * var(--sw, 1))`;

const delay = (seconds: number) => ({ "--draw-delay": `${seconds}s` }) as CSSProperties;

export function HeroBridge({ labels }: { labels?: { today: string; todayText: string; tomorrow: string; tomorrowText: string } }) {
  return (
    <figure className="relative">
      <svg viewBox="-12 0 1224 214" className="hero-bridge h-auto w-full overflow-visible" fill="none" aria-hidden="true">
        {/* Water line and reflection: a quiet horizon under the deck. */}
        <line style={{ strokeWidth: sw(1) }} x1="-12" y1="206" x2="1212" y2="206" stroke="var(--border)" />
        {HANGERS.map((x, i) => (
          <line
            key={x}
            className="fade-in"
            style={{ ...delay(1.1 + i * 0.012), strokeWidth: sw(1) }}
            x1={x}
            y1={cableY(x)}
            x2={x}
            y2={DECK_Y}
            stroke="var(--accent)"
            strokeOpacity="0.28"
            
          />
        ))}
        {TOWERS.map((x) => (
          <g key={x} className="draw-group">
            <line className="draw" style={{ ...delay(0.2), strokeWidth: sw(2) }} pathLength={1} x1={x - 5} y1="10" x2={x - 5} y2="206" stroke="var(--fg)" strokeOpacity="0.85" />
            <line className="draw" style={{ ...delay(0.25), strokeWidth: sw(2) }} pathLength={1} x1={x + 5} y1="10" x2={x + 5} y2="206" stroke="var(--fg)" strokeOpacity="0.85" />
            <line className="fade-in" style={{ ...delay(0.9), strokeWidth: sw(1.5) }} x1={x - 5} y1="44" x2={x + 5} y2="44" stroke="var(--fg)" strokeOpacity="0.6" />
            <line className="fade-in" style={{ ...delay(0.95), strokeWidth: sw(1.5) }} x1={x - 5} y1="120" x2={x + 5} y2="120" stroke="var(--fg)" strokeOpacity="0.6" />
          </g>
        ))}
        <path className="draw" style={{ ...delay(0.5), strokeWidth: sw(2) }} pathLength={1} d={CABLE} stroke="var(--primary)" strokeLinecap="round" />
        <line style={{ strokeWidth: sw(2.5) }} className="draw" pathLength={1} x1="0" y1={DECK_Y} x2="1200" y2={DECK_Y} stroke="var(--fg)" />
        <line className="draw" style={{ ...delay(0.1), strokeWidth: sw(1) }} pathLength={1} x1="0" y1={DECK_Y + 7} x2="1200" y2={DECK_Y + 7} stroke="var(--fg)" strokeOpacity="0.35" />
        {/* The two banks the bridge connects. */}
        <circle style={{ strokeWidth: sw(2) }} cx="0" cy={DECK_Y} r="7" fill="var(--bg)" stroke="var(--fg)" />
        <circle cx="1200" cy={DECK_Y} r="9" fill="var(--primary)" />
        <circle style={{ strokeWidth: sw(1.5) }} cx="1200" cy={DECK_Y} r="16" stroke="var(--primary)" strokeOpacity="0.25" className="pulse-ring" />
        {/* One small traveller crosses the deck once: from today to tomorrow. */}
        <circle className="traveler" r="4.5" fill="var(--primary)" style={{ offsetPath: `path("M0 ${DECK_Y} L1200 ${DECK_Y}")` } as CSSProperties} />
      </svg>
      {labels && (
        <figcaption className="mt-5 flex items-start justify-between gap-6 sm:mt-6">
          <span className="max-w-[46%] text-left">
            <span className="block font-display text-sm font-semibold tracking-tight text-fg">{labels.today}</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted sm:text-sm">{labels.todayText}</span>
          </span>
          <span className="max-w-[46%] text-right">
            <span className="block font-display text-sm font-semibold tracking-tight text-primary dark:text-[var(--ring)]">{labels.tomorrow}</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted sm:text-sm">{labels.tomorrowText}</span>
          </span>
        </figcaption>
      )}
    </figure>
  );
}
