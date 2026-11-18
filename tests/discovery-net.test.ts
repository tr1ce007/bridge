import { describe, expect, it } from "vitest";
import { createPoliteFetcher, createRobotsChecker } from "@/lib/discovery/net";

function clock() {
  let t = 10_000;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
    get t() {
      return t;
    },
  };
}

const reply = (status: number, body = "") => new Response(body, { status });

describe("createPoliteFetcher", () => {
  it("waits so that one host gets at most one request per second", async () => {
    const c = clock();
    const times: number[] = [];
    const f = createPoliteFetcher({
      userAgent: "ua/1",
      now: c.now,
      sleep: c.sleep,
      fetchImpl: async () => {
        times.push(c.now());
        return reply(200, "ok");
      },
    });
    await f.fetchText("https://a.example/1");
    await f.fetchText("https://a.example/2");
    await f.fetchText("https://a.example/3");
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(1000);
    expect(times[2] - times[1]).toBeGreaterThanOrEqual(1000);
  });

  it("does not make different hosts wait for each other", async () => {
    const c = clock();
    const times: number[] = [];
    const f = createPoliteFetcher({
      userAgent: "ua/1",
      now: c.now,
      sleep: c.sleep,
      fetchImpl: async () => {
        times.push(c.now());
        return reply(200, "ok");
      },
    });
    await f.fetchText("https://a.example/1");
    await f.fetchText("https://b.example/1");
    expect(times[1] - times[0]).toBe(0);
  });

  it("sends the user agent and a timeout signal", async () => {
    const c = clock();
    let seen: RequestInit | undefined;
    const f = createPoliteFetcher({
      userAgent: "the-bridge-story-discovery/0.1",
      now: c.now,
      sleep: c.sleep,
      fetchImpl: async (_u, init) => {
        seen = init;
        return reply(200, "ok");
      },
    });
    await f.fetchText("https://a.example/1");
    expect((seen?.headers as Record<string, string>)["User-Agent"]).toBe("the-bridge-story-discovery/0.1");
    expect(seen?.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns status and text, and turns network errors into a clear result", async () => {
    const c = clock();
    const f = createPoliteFetcher({
      userAgent: "ua/1",
      now: c.now,
      sleep: c.sleep,
      fetchImpl: async (url) => {
        if (String(url).includes("boom")) throw new Error("connect ECONNREFUSED");
        return reply(404, "nope");
      },
    });
    expect(await f.fetchText("https://a.example/x")).toMatchObject({ ok: false, status: 404, text: "nope" });
    expect(await f.fetchText("https://a.example/boom")).toMatchObject({ ok: false, status: 0, error: "connect ECONNREFUSED" });
  });

  it("cuts a response that is bigger than the limit", async () => {
    const c = clock();
    const f = createPoliteFetcher({ userAgent: "ua/1", now: c.now, sleep: c.sleep, maxBytes: 100, fetchImpl: async () => reply(200, "x".repeat(500)) });
    const r = await f.fetchText("https://a.example/big");
    expect(r.text.length).toBeLessThanOrEqual(100);
    expect(r.truncated).toBe(true);
  });

  it("refuses addresses that are not http or https", async () => {
    const c = clock();
    const f = createPoliteFetcher({ userAgent: "ua/1", now: c.now, sleep: c.sleep, fetchImpl: async () => reply(200, "ok") });
    expect(await f.fetchText("file:///etc/passwd")).toMatchObject({ ok: false, status: 0 });
    expect(await f.fetchText("not a url")).toMatchObject({ ok: false, status: 0 });
  });
});

describe("createRobotsChecker", () => {
  function setup(robots: { status: number; body?: string } | "throw") {
    const c = clock();
    const calls: string[] = [];
    const fetcher = createPoliteFetcher({
      userAgent: "the-bridge-story-discovery/0.1",
      now: c.now,
      sleep: c.sleep,
      fetchImpl: async (url) => {
        calls.push(String(url));
        if (robots === "throw") throw new Error("down");
        return reply(robots.status, robots.body ?? "");
      },
    });
    return { check: createRobotsChecker(fetcher, "the-bridge-story-discovery/0.1"), calls };
  }

  it("fetches robots.txt once per host and applies it", async () => {
    const { check, calls } = setup({ status: 200, body: "User-agent: *\nDisallow: /private/" });
    expect(await check("https://a.example/feed.xml")).toBe(true);
    expect(await check("https://a.example/private/feed.xml")).toBe(false);
    expect(calls).toEqual(["https://a.example/robots.txt"]);
  });

  it("allows when robots.txt does not exist (404)", async () => {
    expect(await setup({ status: 404 }).check("https://a.example/feed")).toBe(true);
  });

  it("is careful: no access, or a server error, or no connection means do not fetch", async () => {
    expect(await setup({ status: 403 }).check("https://a.example/feed")).toBe(false);
    expect(await setup({ status: 500 }).check("https://a.example/feed")).toBe(false);
    expect(await setup("throw").check("https://a.example/feed")).toBe(false);
  });
});
