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
const redirect = (to: string, status = 302) => new Response(null, { status, headers: { location: to } });

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

describe("redirects", () => {
  function make(routes: Record<string, () => Response>, fetched: string[] = []) {
    const c = clock();
    const times: Record<string, number[]> = {};
    const f = createPoliteFetcher({
      userAgent: "ua/1",
      now: c.now,
      sleep: c.sleep,
      fetchImpl: async (url, init) => {
        const u = String(url);
        fetched.push(`${init?.redirect}:${u}`);
        (times[new URL(u).host] ??= []).push(c.now());
        const route = routes[u];
        return route ? route() : reply(404, "no");
      },
    });
    return { f, times, fetched };
  }

  it("never lets fetch follow redirects by itself", async () => {
    const { f, fetched } = make({ "https://a.example/x": () => reply(200, "ok") });
    await f.fetchText("https://a.example/x");
    expect(fetched).toEqual(["manual:https://a.example/x"]);
  });

  it("follows a redirect inside the same host and keeps the 1 request per second gap", async () => {
    const { f, times } = make({ "https://a.example/old": () => redirect("/new"), "https://a.example/new": () => reply(200, "moved") });
    const r = await f.fetchText("https://a.example/old");
    expect(r).toMatchObject({ ok: true, text: "moved" });
    expect(times["a.example"][1] - times["a.example"][0]).toBeGreaterThanOrEqual(1000);
  });

  it("refuses a redirect to another host unless the gate says yes", async () => {
    const fetched: string[] = [];
    const { f } = make({ "https://a.example/x": () => redirect("https://b.example/y"), "https://b.example/y": () => reply(200, "secret") }, fetched);
    const r = await f.fetchText("https://a.example/x");
    expect(r).toMatchObject({ ok: false, status: 0 });
    expect(r.error).toMatch(/another host/);
    expect(fetched).toEqual(["manual:https://a.example/x"]); // b.example was never contacted
  });

  it("asks the gate (robots check) for every hop and stops when it says no", async () => {
    const fetched: string[] = [];
    const { f } = make({ "https://a.example/x": () => redirect("https://b.example/y"), "https://b.example/y": () => reply(200, "ok") }, fetched);
    const asked: string[] = [];
    const denied = await f.fetchText("https://a.example/x", { allowRedirect: async (u) => (asked.push(u), false) });
    expect(denied.ok).toBe(false);
    expect(asked).toEqual(["https://b.example/y"]);
    expect(fetched).toHaveLength(1);
    const allowed = await f.fetchText("https://a.example/x", { allowRedirect: async () => true });
    expect(allowed).toMatchObject({ ok: true, text: "ok" });
  });

  it("gives another host its own slot (rate limit per host, per hop)", async () => {
    const { f, times } = make({ "https://a.example/x": () => redirect("https://b.example/y"), "https://b.example/y": () => reply(200, "ok") });
    await f.fetchText("https://a.example/x", { allowRedirect: async () => true });
    await f.fetchText("https://b.example/y");
    expect(times["b.example"][1] - times["b.example"][0]).toBeGreaterThanOrEqual(1000);
  });

  it("stops after 3 redirects", async () => {
    const routes: Record<string, () => Response> = {};
    for (let i = 0; i < 6; i += 1) routes[`https://a.example/${i}`] = () => redirect(`/${i + 1}`);
    const { f, fetched } = make(routes);
    const r = await f.fetchText("https://a.example/0");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/redirects/);
    expect(fetched).toHaveLength(4); // the first request + 3 hops
  });

  it("refuses a redirect to a non-http address and does not send credentials to another host", async () => {
    const { f } = make({ "https://a.example/x": () => redirect("file:///etc/passwd") });
    expect((await f.fetchText("https://a.example/x", { allowRedirect: async () => true })).ok).toBe(false);
    const seen: Record<string, string>[] = [];
    const c = clock();
    const f2 = createPoliteFetcher({
      userAgent: "ua/1",
      now: c.now,
      sleep: c.sleep,
      fetchImpl: async (url, init) => {
        seen.push(init?.headers as Record<string, string>);
        return String(url).startsWith("https://a.example") ? redirect("https://b.example/y") : reply(200, "ok");
      },
    });
    await f2.fetchText("https://a.example/x", { headers: { Authorization: "Bearer secret" }, allowRedirect: async () => true });
    expect(seen[0].Authorization).toBe("Bearer secret");
    expect(seen[1].Authorization).toBeUndefined();
  });

  it("turns a redirected POST into a GET without a body", async () => {
    const calls: { method?: string; body?: unknown }[] = [];
    const c = clock();
    const f = createPoliteFetcher({
      userAgent: "ua/1",
      now: c.now,
      sleep: c.sleep,
      fetchImpl: async (url, init) => {
        calls.push({ method: init?.method, body: init?.body });
        return String(url).endsWith("/a") ? redirect("/b", 302) : reply(200, "ok");
      },
    });
    await f.fetchText("https://a.example/a", { method: "POST", body: "x=1" });
    expect(calls).toEqual([{ method: "POST", body: "x=1" }, { method: "GET", body: undefined }]);
  });
});

describe("redirect + robots together", () => {
  it("does not fetch a redirect target that its own robots.txt forbids", async () => {
    const c = clock();
    const fetched: string[] = [];
    const fetcher = createPoliteFetcher({
      userAgent: "the-bridge-story-discovery/0.1",
      now: c.now,
      sleep: c.sleep,
      fetchImpl: async (url) => {
        const u = String(url);
        fetched.push(u);
        if (u === "https://b.example/robots.txt") return reply(200, "User-agent: *\nDisallow: /feed");
        if (u === "https://a.example/feed.xml") return redirect("https://b.example/feed.xml");
        return reply(200, "<rss/>");
      },
    });
    const allowed = createRobotsChecker(fetcher, "the-bridge-story-discovery/0.1");
    const r = await fetcher.fetchText("https://a.example/feed.xml", { allowRedirect: allowed });
    expect(r.ok).toBe(false);
    expect(fetched).toEqual(["https://a.example/feed.xml", "https://b.example/robots.txt"]);
  });
});

describe("body size cap", () => {
  it("stops reading a stream at the limit instead of loading it all", async () => {
    const c = clock();
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(new Uint8Array(40).fill(97));
        if (pulled > 1000) controller.close();
      },
    });
    const f = createPoliteFetcher({ userAgent: "ua/1", now: c.now, sleep: c.sleep, maxBytes: 100, fetchImpl: async () => new Response(stream, { status: 200 }) });
    const r = await f.fetchText("https://a.example/big");
    expect(r.text).toBe("a".repeat(100));
    expect(r.truncated).toBe(true);
    expect(pulled).toBeLessThan(10);
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
