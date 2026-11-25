/** Small colour helpers for the appearance editor. Inputs are validated `#rrggbb` strings. */

export type Rgb = [number, number, number];

export const WHITE = "#ffffff";
export const BLACK = "#000000";
/** Page background of the dark theme (globals.css `[data-theme="dark"] --bg`). */
export const DARK_BG = "#0a1324";

export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** `amount` 0 keeps `a`, 1 gives `b`. */
export function mix(a: string, b: string, amount: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as Rgb);
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Moves `color` towards `toward` (white or black) in small steps until it reaches `ratio` against
 * `background`. Returns `toward` itself if no step gets there.
 */
export function ensureContrast(color: string, background: string, ratio: number, toward: string): string {
  for (let step = 0; step <= 20; step++) {
    const c = mix(color, toward, step / 20);
    if (contrast(c, background) >= ratio) return c;
  }
  return toward;
}

/** Text that sits on top of buttons and dark bands is white: this is the minimum ratio for it. */
export const MIN_TEXT_CONTRAST = 4.5;
