import { mockGenerationProvider } from "@/services/generation/mock-provider";
import type { GenerationProvider } from "@/services/generation/types";

/**
 * Provider registry.
 *
 * Adding OpenAI is one file plus one entry here:
 *
 *   import { openAiProvider } from "./openai-provider";
 *   const PROVIDERS = { mock: mockGenerationProvider, openai: openAiProvider };
 *
 * The route, the services and the UI already read whatever this returns, so
 * nothing else moves. Set GENERATION_PROVIDER to pick one.
 */

const PROVIDERS: Record<string, GenerationProvider> = {
  mock: mockGenerationProvider,
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

export * from "@/services/generation/types";
