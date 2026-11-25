import { getSiteSettings } from "@/lib/site-settings/load";
import { decodeLogo } from "@/lib/site-settings/logo";

/** The logo uploaded in admin → Appearance. The URL carries a fingerprint, so it can be cached long. */
export async function GET() {
  const { logo } = await getSiteSettings();
  const decoded = logo ? decodeLogo(logo) : null;
  if (!decoded) return new Response("Not found", { status: 404 });
  return new Response(decoded.bytes, {
    headers: {
      "content-type": decoded.type,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
