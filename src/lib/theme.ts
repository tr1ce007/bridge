export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "the-bridge-theme";

/**
 * Runs inline in <head> before first paint so the page never flashes the
 * wrong theme. Uses bare globals (document, localStorage, matchMedia) and
 * survives storage access throwing (private mode / blocked site data).
 */
export const themeInitScript = `(function(){var s=null;try{s=localStorage.getItem(${JSON.stringify(
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
