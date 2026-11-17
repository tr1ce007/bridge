import { notFound } from "next/navigation";

// Catch-all for unknown paths under a locale, so they render the localized
// [locale]/not-found.tsx inside the site layout. Real routes take precedence.
export default function CatchAllPage() {
  notFound();
}
