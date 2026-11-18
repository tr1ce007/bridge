/**
 * Fixed-window rate limit kept in this server process's memory.
 *
 * LIMITATION: the counters live in one Node process. On serverless or with several instances
 * each instance counts separately and a restart resets everything, so this is a soft guard
 * against accidental loops and casual abuse, not real abuse protection. For real limits use a
 * shared store (e.g. Upstash Redis) behind the same `rateLimit(key, limit, windowMs)` signature.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Hard cap on tracked keys; the oldest key (Map insertion order) is evicted first, in O(1). */
export const RATE_LIMIT_MAX_KEYS = 10_000;

/** Returns true when the request is allowed, false when `key` has used up its `limit` in this window. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    // Re-insert so the Map's insertion order stays "oldest window first".
    buckets.delete(key);
    while (buckets.size >= RATE_LIMIT_MAX_KEYS) {
      const oldest = buckets.keys().next().value;
      if (oldest === undefined) break;
      buckets.delete(oldest);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Number of keys currently tracked (for tests). */
export function rateLimitSize(): number {
  return buckets.size;
}

/**
 * Client address for the rate-limit key.
 * - `x-real-ip` first: set by the reverse proxy / platform, not by the client (Vercel does; nginx only with `proxy_set_header X-Real-IP $remote_addr;`).
 * - else the LAST `x-forwarded-for` hop: that one is appended by the nearest proxy; earlier hops
 *   are whatever the client sent and can be spoofed freely.
 * - else "unknown" (all such requests share one bucket).
 * Behind no proxy at all both headers are client-controlled; deploy behind a proxy that sets them.
 */
export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return hops[hops.length - 1] ?? "unknown";
}

export function aiRateLimit(request: Request, route: string): boolean {
  const limit = Number(process.env.RATE_LIMIT_PER_MINUTE || 10);
  return rateLimit(`${clientIp(request)}|${route}`, Number.isFinite(limit) && limit > 0 ? limit : 10, 60_000);
}
