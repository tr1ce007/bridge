export interface ReadResult {
  text: string;
  aborted: boolean;
}

/**
 * Reads a text stream (the body of POST /api/ai/chat) and calls `onChunk` with each decoded piece.
 * Multi-byte characters split between chunks are decoded correctly. When `signal` aborts, reading stops,
 * the stream is cancelled (so the server stops generating) and `{ aborted: true }` is returned together
 * with the text read so far. Any other read error is thrown.
 */
export async function readTextStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<ReadResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const push = (chunk: string) => {
    if (!chunk) return;
    text += chunk;
    onChunk(chunk);
  };
  try {
    for (;;) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => {});
        return { text, aborted: true };
      }
      let step: ReadableStreamReadResult<Uint8Array>;
      try {
        step = await reader.read();
      } catch (error) {
        if (signal?.aborted) return { text, aborted: true };
        throw error;
      }
      if (step.done) break;
      push(decoder.decode(step.value, { stream: true }));
    }
    push(decoder.decode());
    return { text, aborted: false };
  } finally {
    reader.releaseLock();
  }
}
