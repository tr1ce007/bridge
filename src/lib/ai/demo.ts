import "server-only";
import { demoChatReply } from "./demo-chat";
import { typedStream } from "./stream";
import { AIError, type AIProvider } from "./types";

/** No AI key: JSON calls fail fast (callers use rule-based fallbacks), chat answers with the rule-based guide. */
export function createDemoProvider(): AIProvider {
  return {
    name: "demo",
    async generateJSON() {
      throw new AIError("demo", "AI is not connected (demo mode)");
    },
    streamChat(messages, options) {
      return typedStream(demoChatReply(messages, options.locale));
    },
  };
}
