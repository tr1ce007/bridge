import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed `middleware.ts` to `proxy.ts`; behaviour is the same.
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and files with an extension (images, icons…).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
