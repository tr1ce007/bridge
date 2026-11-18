const encoder = new TextEncoder();

/** A finished text stream (demo answers, short notices). */
export function textStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

export function encodeText(text: string): Uint8Array {
  return encoder.encode(text);
}

/** A demo answer that appears a few words at a time, like typing (about 1–2 s in total). */
export function typedStream(text: string, delayMs = 12): ReadableStream<Uint8Array> {
  const chunks = text.match(/\S+\s*|\s+/g) ?? [];
  let i = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new ReadableStream({
    start(controller) {
      const step = () => {
        if (i >= chunks.length) return controller.close();
        controller.enqueue(encoder.encode(chunks.slice(i, i + 2).join("")));
        i += 2;
        timer = setTimeout(step, delayMs);
      };
      step();
    },
    cancel() {
      clearTimeout(timer);
    },
  });
}
