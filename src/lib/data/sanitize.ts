/**
 * Cleans user-supplied text (story submissions): removes markup, control
 * characters and surplus whitespace. It does not "fix" prompt-injection phrases;
 * those are neutralised later by passing text to the model as delimited data.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(/<\/?[a-z!][^>]*>/gi, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
