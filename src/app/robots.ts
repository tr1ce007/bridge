import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** Search engines may read the public pages; personal and staff pages stay out of the index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/admin", "/*/dashboard", "/*/settings", "/*/report/", "/*/journal", "/*/auth"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
