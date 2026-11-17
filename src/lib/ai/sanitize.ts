/**
 * Prompt-injection guard: anything that is content (stories, the person's free text, earlier
 * AI follow-up questions) goes into the prompt only through `wrapAsData`. Angle brackets and
 * ampersands are escaped, so the text can never close the block or open a tag of its own; the
 * system prompts say that <data> blocks are content, never instructions.
 */
function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function wrapAsData(label: string, text: string): string {
  const safeLabel = escapeText(label).replace(/"/g, "&quot;");
  return `<data label="${safeLabel}">${escapeText(text)}</data>`;
}
