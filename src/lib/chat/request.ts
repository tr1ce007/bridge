import { CHAT_MAX_MESSAGE_CHARS, CHAT_MAX_MESSAGES, CHAT_MAX_SUMMARY_CHARS } from "@/lib/ai/chat-limits";

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Turns the on-screen conversation into what the route accepts: no empty turns, same-role neighbours
 * merged (after an error the person may write twice in a row), every message within the length limit,
 * at most the last 40 turns, starting and ending with the person's turn.
 */
export function toRequestMessages(history: Turn[]): Turn[] {
  const merged: Turn[] = [];
  for (const m of history) {
    const content = m.content.trim();
    if (!content) continue;
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${content}`;
    else merged.push({ role: m.role, content });
  }
  const limited = merged.slice(-CHAT_MAX_MESSAGES).map((m) => ({ ...m, content: m.content.slice(0, CHAT_MAX_MESSAGE_CHARS) }));
  while (limited.length && limited[0].role !== "user") limited.shift();
  while (limited.length && limited[limited.length - 1].role !== "user") limited.pop();
  return limited;
}

/** Profile summary within the route's limit (cut at a line break), or undefined when empty. */
export function trimSummary(summary: string): string | undefined {
  const text = summary.trim();
  if (!text) return undefined;
  if (text.length <= CHAT_MAX_SUMMARY_CHARS) return text;
  const cut = text.slice(0, CHAT_MAX_SUMMARY_CHARS);
  const lineEnd = cut.lastIndexOf("\n");
  return (lineEnd > 0 ? cut.slice(0, lineEnd) : cut).trimEnd();
}
