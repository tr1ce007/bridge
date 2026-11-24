/** Public address of the site (for absolute links in previews, the sitemap and robots.txt). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://bridge-six-wheat.vercel.app").replace(/\/+$/, "");
