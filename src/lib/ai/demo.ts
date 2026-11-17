import "server-only";
import { demoChatText } from "./server-copy";
import { textStream } from "./stream";
import { AIError, type AIProvider } from "./types";

/** No AI key: JSON calls fail fast (callers use rule-based fallbacks), chat explains and links. */
export function createDemoProvider(): AIProvider {
  return {
    name: "demo",
    async generateJSON() {
      throw new AIError("demo", "AI is not connected (demo mode)");
    },
    streamChat(_messages, options) {
      return textStream(demoChatText(options.locale));
    },
  };
}
