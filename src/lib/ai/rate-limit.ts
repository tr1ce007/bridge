/**
 * Fixed-window rate limit kept in this server process's memory.
 *
 * LIMITATION: the counters live in one Node process. On serverless or with several instances
 * each instance counts separately and a restart resets everything, so this is a soft guard
 * against accidental loops, not abuse protection. For real limits use a shared store
 * (e.g. Upstash Redis) behind the same `rateLimit(key, limit, windowMs)` signature.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 10_000;

/** Returns true when the request is allowed, false when `key` has used up its `limit` in this window. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Best-effort client address for the rate-limit key (first X-Forwarded-For hop). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "local";
}

export function aiRateLimit(request: Request, route: string): boolean {
  const limit = Number(process.env.RATE_LIMIT_PER_MINUTE || 10);
  return rateLimit(`${clientIp(request)}|${route}`, Number.isFinite(limit) && limit > 0 ? limit : 10, 60_000);
}
