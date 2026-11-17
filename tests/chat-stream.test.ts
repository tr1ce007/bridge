import { describe, expect, it } from "vitest";
import { readTextStream } from "@/lib/chat/stream";

const enc = new TextEncoder();

function streamOf(parts: (string | Uint8Array)[], opts: { failAfter?: number } = {}) {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (opts.failAfter !== undefined && i >= opts.failAfter) {
        controller.error(new Error("network down"));
        return;
      }
      if (i >= parts.length) return controller.close();
      const p = parts[i++];
      controller.enqueue(typeof p === "string" ? enc.encode(p) : p);
    },
  });
}

describe("readTextStream", () => {
  it("passes every chunk to onChunk and returns the whole text", async () => {
    const chunks: string[] = [];
    const out = await readTextStream(streamOf(["Привет", ", ", "мир"]), (c) => chunks.push(c));
    expect(chunks).toEqual(["Привет", ", ", "мир"]);
    expect(out).toEqual({ text: "Привет, мир", aborted: false });
  });

  it("decodes multi-byte characters split across chunks", async () => {
    const bytes = enc.encode("Ё«я»"); // Cyrillic: 2 bytes per letter
    const parts = [bytes.slice(0, 1), bytes.slice(1, 4), bytes.slice(4)];
    const out = await readTextStream(streamOf(parts), () => {});
    expect(out.text).toBe("Ё«я»");
  });

  it("skips empty chunks", async () => {
    const chunks: string[] = [];
    await readTextStream(streamOf(["", "a", ""]), (c) => chunks.push(c));
    expect(chunks).toEqual(["a"]);
  });

  it("stops and reports aborted when the signal fires, keeping what was read", async () => {
    const ctrl = new AbortController();
    let cancelled = false;
    let n = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(enc.encode(`p${n++} `));
      },
      cancel() {
        cancelled = true;
      },
    });
    const chunks: string[] = [];
    const out = await readTextStream(
      body,
      (c) => {
        chunks.push(c);
        if (chunks.length === 3) ctrl.abort();
      },
      ctrl.signal,
    );
    expect(out.aborted).toBe(true);
    expect(out.text).toBe("p0 p1 p2 ");
    expect(cancelled).toBe(true);
  });

  it("returns aborted immediately when the signal is already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const chunks: string[] = [];
    const out = await readTextStream(streamOf(["a"]), (c) => chunks.push(c), ctrl.signal);
    expect(out).toEqual({ text: "", aborted: true });
    expect(chunks).toEqual([]);
  });

  it("treats a read error after abort as an abort, and a read error otherwise as an error", async () => {
    await expect(readTextStream(streamOf(["a", "b"], { failAfter: 1 }), () => {})).rejects.toThrow("network down");

    const ctrl = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode("a"));
      },
      pull() {
        return new Promise(() => {});
      },
    });
    const done = readTextStream(body, () => ctrl.abort(), ctrl.signal);
    await expect(done).resolves.toMatchObject({ aborted: true, text: "a" });
  });
});
