import type { CSSProperties } from "react";

// Line drawing of a suspension bridge: two towers, a main cable, hangers, deck.
// The intro animation is pure CSS (.draw / .fade-in in globals.css), gated by
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

const HANGERS = Array.from({ length: 29 }, (_, i) => 40 + i * 40).filter(
  (x) => !TOWERS.includes(x) && DECK_Y - cableY(x) > 6,
);

const delay = (seconds: number) => ({ "--draw-delay": `${seconds}s` }) as CSSProperties;

export function HeroBridge() {
  return (
    <svg viewBox="0 0 1200 200" className="h-auto w-full" fill="none" aria-hidden="true">
      <line className="draw" pathLength={1} x1="0" y1={DECK_Y} x2="1200" y2={DECK_Y} stroke="var(--fg)" strokeOpacity="0.5" strokeWidth="1.5" />
      {TOWERS.map((x) => (
        <line key={x} className="draw" style={delay(0.2)} pathLength={1} x1={x} y1="12" x2={x} y2="200" stroke="var(--fg)" strokeOpacity="0.7" strokeWidth="3" />
      ))}
      <path className="draw" style={delay(0.5)} pathLength={1} d={CABLE} stroke="var(--accent)" strokeWidth="1.75" />
      {HANGERS.map((x, i) => (
        <line
          key={x}
          className="fade-in"
          style={delay(1.2 + i * 0.02)}
          x1={x}
          y1={cableY(x)}
          x2={x}
          y2={DECK_Y}
          stroke="var(--fg)"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
