/** Server env values that must never reach a log line, even if a misconfiguration puts them in an error. */
const SECRET_ENV_NAMES = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "REDDIT_CLIENT_SECRET",
] as const;

/**
 * Removes anything secret-looking from an error message before it is logged:
 * the configured secret values themselves, URLs (which can carry keys or point at a misused key),
 * and long token-like strings such as API keys.
 */
export function redactSecrets(text: string, env: Record<string, string | undefined> = process.env): string {
  let out = text;
  for (const name of SECRET_ENV_NAMES) {
    const value = env[name]?.trim();
    if (value && value.length >= 8) out = out.split(value).join("[redacted]");
  }
  return out
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[url]")
    .replace(/[A-Za-z0-9_\-.]{24,}/g, "[redacted]");
}
