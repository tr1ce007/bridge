import { isAllowedByRobots } from "./robots";

export interface FetchResult {
  ok: boolean;
  /** HTTP status, or 0 when there was no answer (network error, timeout, bad address). */
  status: number;
  text: string;
  truncated?: boolean;
  error?: string;
}

export interface PoliteFetcherOptions {
  userAgent: string;
  fetchImpl?: typeof fetch;
  /** Smallest gap between two requests to the same host. Default 1000 ms. */
  minIntervalMs?: number;
  timeoutMs?: number;
  /** Responses larger than this are cut. Default 3 MB. */
  maxBytes?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface PoliteFetcher {
  fetchText(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<FetchResult>;
}

/** HTTP client for the script: 1 request per second per host, a timeout, a size limit, our user agent. */
export function createPoliteFetcher(options: PoliteFetcherOptions): PoliteFetcher {
  const {
    userAgent,
    fetchImpl = fetch,
    minIntervalMs = 1000,
    timeoutMs = 15_000,
    maxBytes = 3_000_000,
    now = Date.now,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  } = options;
  const nextFree = new Map<string, number>();

  return {
    async fetchText(url, init = {}) {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return { ok: false, status: 0, text: "", error: "not a valid address" };
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { ok: false, status: 0, text: "", error: "only http and https addresses are allowed" };
      }
      // Reserve our slot first, so two parallel calls to one host still keep the gap.
      const host = parsed.host;
      const slot = Math.max(now(), nextFree.get(host) ?? 0);
      nextFree.set(host, slot + minIntervalMs);
      const wait = slot - now();
      if (wait > 0) await sleep(wait);

      try {
        const res = await fetchImpl(url, {
          method: init.method ?? "GET",
          headers: { "User-Agent": userAgent, ...init.headers },
          ...(init.body !== undefined ? { body: init.body } : {}),
          signal: AbortSignal.timeout(timeoutMs),
          redirect: "follow",
        });
        let text = await res.text();
        let truncated = false;
        if (text.length > maxBytes) {
          text = text.slice(0, maxBytes);
          truncated = true;
        }
        return { ok: res.ok, status: res.status, text, ...(truncated ? { truncated } : {}) };
      } catch (e) {
        return { ok: false, status: 0, text: "", error: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}

/**
 * robots.txt gate: fetches robots.txt once per host and answers "may we fetch this address?".
 * 404 / 410 = no rules = allowed. Any other failure (no access, server error, no connection) = not allowed,
 * so we never fetch from a site we could not ask.
 */
export function createRobotsChecker(fetcher: PoliteFetcher, userAgent: string): (url: string) => Promise<boolean> {
  const cache = new Map<string, Promise<string | null>>();
  return async (url: string) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    const origin = parsed.origin;
    let pending = cache.get(origin);
    if (!pending) {
      pending = fetcher.fetchText(`${origin}/robots.txt`).then((r) => {
        if (r.ok) return r.text;
        if (r.status === 404 || r.status === 410) return "";
        return null; // not allowed
      });
      cache.set(origin, pending);
    }
    const robots = await pending;
    if (robots === null) return false;
    return isAllowedByRobots(robots, `${parsed.pathname}${parsed.search}`, userAgent);
  };
}
