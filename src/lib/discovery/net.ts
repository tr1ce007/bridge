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

export interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /**
   * Asked before following EVERY redirect (the robots check for the new address). Without it,
   * redirects to another host are refused and redirects inside the same host are followed
   * (at most MAX_REDIRECTS hops in total).
   */
  allowRedirect?: (url: string) => Promise<boolean>;
}

export interface PoliteFetcher {
  fetchText(url: string, init?: FetchInit): Promise<FetchResult>;
}

export const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Reads a response body as text, never holding more than `maxBytes` bytes. */
async function readCapped(res: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.byteLength > maxBytes) {
      chunks.push(value.subarray(0, maxBytes - total));
      total = maxBytes;
      truncated = true;
      await reader.cancel().catch(() => undefined);
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return { text: new TextDecoder("utf-8").decode(bytes), truncated };
}

/**
 * HTTP client for the script: 1 request per second per host (every hop of a redirect counts), a
 * timeout, a size limit, our user agent. Redirects are followed by hand, at most MAX_REDIRECTS,
 * http(s) only; every hop is re-checked with `allowRedirect` (the robots check) when given; without it another host is refused.
 */
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

  const fail = (error: string): FetchResult => ({ ok: false, status: 0, text: "", error });

  return {
    async fetchText(url, init = {}) {
      let current: URL;
      try {
        current = new URL(url);
      } catch {
        return fail("not a valid address");
      }
      const startHost = current.host;
      let method = init.method ?? "GET";
      let body = init.body;
      const headers = { "User-Agent": userAgent, ...init.headers };
      const deadline = AbortSignal.timeout(timeoutMs);

      for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        if (current.protocol !== "https:" && current.protocol !== "http:") return fail("only http and https addresses are allowed");
        if (hop > 0) {
          if (init.allowRedirect) {
            if (!(await init.allowRedirect(current.href))) return fail(`redirect refused (robots.txt or policy): ${current.host}`);
          } else if (current.host !== startHost) {
            return fail(`redirect to another host refused (${current.host})`);
          }
        }
        // Reserve our slot first, so two parallel calls to one host still keep the gap.
        const host = current.host;
        const slot = Math.max(now(), nextFree.get(host) ?? 0);
        nextFree.set(host, slot + minIntervalMs);
        const wait = slot - now();
        if (wait > 0) await sleep(wait);

        try {
          const res = await fetchImpl(current.href, {
            method,
            headers: hop > 0 && current.host !== startHost ? { "User-Agent": userAgent } : headers,
            ...(body !== undefined ? { body } : {}),
            signal: deadline,
            redirect: "manual",
          });
          if (REDIRECT_STATUSES.has(res.status)) {
            const location = res.headers.get("location");
            await res.body?.cancel().catch(() => undefined);
            if (!location) return { ok: false, status: res.status, text: "", error: "redirect without a location" };
            if (hop === MAX_REDIRECTS) return fail(`more than ${MAX_REDIRECTS} redirects`);
            try {
              current = new URL(location, current);
            } catch {
              return fail("redirect to an invalid address");
            }
            if (res.status === 303 || ((res.status === 301 || res.status === 302) && method !== "GET" && method !== "HEAD")) {
              method = "GET";
              body = undefined;
            }
            continue;
          }
          const { text, truncated } = await readCapped(res, maxBytes);
          return { ok: res.ok, status: res.status, text, ...(truncated ? { truncated } : {}) };
        } catch (e) {
          return fail(e instanceof Error ? e.message : String(e));
        }
      }
      return fail(`more than ${MAX_REDIRECTS} redirects`);
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
