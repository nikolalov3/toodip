import { mockGenerationProvider } from "@/services/generation/mock-provider";
import { openAiGenerationProvider } from "@/services/generation/openai-provider";
import type { GenerationProvider } from "@/services/generation/types";

/**
 * Provider registry. GENERATION_PROVIDER picks the active one.
 *
 * mock    deterministic rule engine, no API call, no cost. The default.
 * openai  the real thing, needs OPENAI_API_KEY.
 *
 * Routes, services and screens read whatever this returns, so switching engines
 * changes nothing else in the codebase.
 */

const PROVIDERS: Record<string, GenerationProvider> = {
  mock: mockGenerationProvider,
  openai: openAiGenerationProvider,
};

export function getGenerationProvider(): GenerationProvider {
  const requested = process.env.GENERATION_PROVIDER ?? "mock";
  const provider = PROVIDERS[requested];
  if (!provider) {
    throw new Error(
      `Unknown generation provider "${requested}". Available: ${Object.keys(PROVIDERS).join(", ")}.`,
    );
  }
  return provider;
}

export function listGenerationProviders(): GenerationProvider[] {
  return Object.values(PROVIDERS);
}

export function getGenerationProviderById(
  id: string,
): GenerationProvider | null {
  return PROVIDERS[id] ?? null;
}

export * from "@/services/generation/types";
