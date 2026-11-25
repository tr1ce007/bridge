import { BLACK, contrast, DARK_BG, ensureContrast, MIN_TEXT_CONTRAST, mix, WHITE } from "./color";
import type { SiteSettings } from "./schema";

type Vars = Record<string, string>;

/** Lighter variant for the dark theme that still keeps white text readable on it. */
function darkPrimary(primary: string): string {
  for (const amount of [0.18, 0.12, 0.06, 0]) {
    const c = mix(primary, WHITE, amount);
    if (contrast(c, WHITE) >= MIN_TEXT_CONTRAST) return c;
  }
  return primary;
}

/** CSS variables for each theme derived from the editor's colours (only the ones that were set). */
export function themeVars(colors: SiteSettings["colors"]): { light: Vars; dark: Vars } {
  const light: Vars = {};
  const dark: Vars = {};
  const { primary, accent, navy } = colors;

  if (primary) {
    const dp = darkPrimary(primary);
    Object.assign(light, {
      "--primary": primary,
      "--primary-hover": mix(primary, BLACK, 0.15),
      "--primary-soft": mix(primary, WHITE, 0.9),
      "--ring": primary,
    });
    Object.assign(dark, {
      "--primary": dp,
      "--primary-hover": mix(dp, WHITE, 0.15),
      "--primary-soft": mix(primary, DARK_BG, 0.8),
      "--ring": mix(primary, WHITE, 0.4),
    });
  }
  if (accent) {
    const line = mix(accent, WHITE, 0.25);
    Object.assign(light, {
      "--accent": accent,
      "--accent-text": ensureContrast(accent, WHITE, MIN_TEXT_CONTRAST, BLACK),
      "--brand-line": line,
    });
    Object.assign(dark, {
      "--accent": line,
      "--accent-text": ensureContrast(line, DARK_BG, MIN_TEXT_CONTRAST, WHITE),
    });
  }
  if (navy) {
    Object.assign(light, { "--navy": navy, "--brand-navy": navy });
    Object.assign(dark, { "--navy": mix(navy, BLACK, 0.5) });
  }
  return { light, dark };
}

const block = (selector: string, vars: Vars) =>
  `${selector}{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;

/**
 * A `<style>` body that overrides the design tokens from globals.css. Empty when nothing is set.
 * Values are validated `#rrggbb` colours, so nothing else can end up in the stylesheet.
 */
export function themeCss(colors: SiteSettings["colors"]): string {
  const { light, dark } = themeVars(colors);
  if (!Object.keys(light).length) return "";
  return [
    block(":root", light),
    block('[data-theme="dark"]', dark),
    `@media (prefers-color-scheme: dark){${block(":root:not([data-theme])", dark)}}`,
  ].join("");
}
