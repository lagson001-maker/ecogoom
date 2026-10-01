import "server-only";
import { aiEnv } from "@/lib/env";
import { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL } from "./anthropic";
import type { AIProvider } from "./types";

export type { AIProvider } from "./types";

/**
 * Returns the configured provider, or null when AI is not configured.
 * Callers must always have a non-AI fallback path.
 *
 * Add a provider: implement AIProvider in lib/ai/<name>.ts and add a case here.
 */
export function getAIProvider(): AIProvider | null {
  const { provider, apiKey, model } = aiEnv();
  if (!apiKey) return null;
  switch (provider || "anthropic") {
    case "anthropic":
      return new AnthropicProvider(apiKey, model || DEFAULT_ANTHROPIC_MODEL);
    default:
      console.warn(`[ai] Unsupported AI_PROVIDER "${provider}" — AI features disabled.`);
      return null;
  }
}

export function isAIConfigured(): boolean {
  return getAIProvider() !== null;
}
