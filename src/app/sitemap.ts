import type { MetadataRoute } from "next";
import { bundledStories } from "@/lib/data/local-content";
import { LOCALES } from "@/lib/data/types";
import { SITE_URL } from "@/lib/site-url";

const PAGES = ["", "/explore", "/chat", "/stories", "/try", "/opportunities", "/mentors", "/what-if", "/about", "/privacy"];

/** Public pages in every language plus each story, so search engines can find them. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...PAGES, ...bundledStories.map((s) => `/stories/${s.id}`)];
  return LOCALES.flatMap((locale) =>
    paths.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
    })),
  );
}
