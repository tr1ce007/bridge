export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "the-bridge-theme";

/**
 * Runs inline in <head> before first paint so the page never flashes the
 * wrong theme. Also adds the `js` class to <html>, which gates CSS-only intro
 * animations (content stays visible when JS is off). Uses bare globals (document, localStorage, matchMedia) and
 * survives storage access throwing (private mode / blocked site data).
 */
export const themeInitScript = `(function(){document.documentElement.classList.add("js");var s=null;try{s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})}catch(e){}var d=false;try{d=matchMedia("(prefers-color-scheme: dark)").matches}catch(e){}document.documentElement.dataset.theme=(s==="light"||s==="dark")?s:(d?"dark":"light")})();`;

export function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable: the choice simply lasts for this page view.
  }
}

/**
 * Client-side fallback for pages whose server HTML did not include the inline
 * script (Next.js serves 404s for a dynamic root layout as an error shell and
 * renders the page on the client). Same rules as themeInitScript.
 */
export function ensureThemeApplied(): void {
  const root = document.documentElement;
  root.classList.add("js");
  if (root.dataset.theme) return;
  let prefersDark = false;
  try {
    prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    // matchMedia unavailable: default to light.
  }
  const stored = readStoredTheme();
  root.dataset.theme = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
}
