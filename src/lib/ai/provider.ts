import "server-only";
import { createAnthropicProvider } from "./anthropic";
import { createDemoProvider } from "./demo";
import { createOpenAIProvider } from "./openai";
import type { AIProvider, ProviderName } from "./types";

type Env = Record<string, string | undefined>;

/**
 * AI_PROVIDER = anthropic | openai | demo. Empty = automatic: anthropic when ANTHROPIC_API_KEY is
 * set, else openai when OPENAI_API_KEY is set, else demo. A named provider without its key is demo.
 */
export function resolveProviderName(env: Env = process.env): ProviderName {
  const wanted = env.AI_PROVIDER?.trim().toLowerCase();
  const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY?.trim());
  const hasOpenAI = Boolean(env.OPENAI_API_KEY?.trim());
  if (wanted === "demo") return "demo";
  if (wanted === "anthropic") return hasAnthropic ? "anthropic" : "demo";
  if (wanted === "openai") return hasOpenAI ? "openai" : "demo";
  return hasAnthropic ? "anthropic" : hasOpenAI ? "openai" : "demo";
}

export function isDemoMode(): boolean {
  return resolveProviderName() === "demo";
}

let cached: { key: string; provider: AIProvider } | undefined;

/** The provider for this server. Keys are read here only (server code). */
export function getProvider(env: Env = process.env): AIProvider {
  const name = resolveProviderName(env);
  const key = [name, env.ANTHROPIC_MODEL, env.OPENAI_MODEL, env.OPENAI_FALLBACK_MODEL, env.OPENAI_BASE_URL].join("|");
  if (cached?.key === key) return cached.provider;
  const provider =
    name === "anthropic"
      ? createAnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY!.trim(), model: env.ANTHROPIC_MODEL?.trim() })
      : name === "openai"
        ? createOpenAIProvider({
            apiKey: env.OPENAI_API_KEY!.trim(),
            baseUrl: env.OPENAI_BASE_URL?.trim(),
            model: env.OPENAI_MODEL?.trim(),
            fallbackModel: env.OPENAI_FALLBACK_MODEL?.trim() || undefined,
          })
        : createDemoProvider();
  cached = { key, provider };
  return provider;
}
