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
