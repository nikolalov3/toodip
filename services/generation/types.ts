import type { AssembledPrompt } from "@/prompts/builder";
import type {
  BrandVoiceExample,
  BusinessProfile,
  KeywordBankItem,
  ReviewWithContext,
} from "@/types/domain";

export interface GenerationContext {
  review: ReviewWithContext;
  profile: BusinessProfile;
  keywords: KeywordBankItem[];
  brandVoice: BrandVoiceExample[];
  draftCount: number;
  /** Text of drafts the operator has already seen. Forces a new angle. */
  previousDrafts: string[];
}

export interface GeneratedDraft {
  text: string;
  /** Internal note on the angle taken. Not shown to the reviewer. */
  rationale: string;
  keywordUsed: string | null;
}

export interface GenerationUsage {
  promptTokens: number | null;
  completionTokens: number | null;
}

export interface GenerationProviderResult {
  model: string;
  drafts: GeneratedDraft[];
  usage: GenerationUsage;
  latencyMs: number;
}

/**
 * Contract every reply engine implements.
 *
 * Today: the deterministic mock. Next: an OpenAI provider that sends
 * `prompt.messages` and parses the response. Nothing above this interface
 * changes when that lands.
 */
export interface GenerationProvider {
  id: string;
  label: string;
  /** True when the provider produces text without an external API call. */
  offline: boolean;
  generate(
    prompt: AssembledPrompt,
    context: GenerationContext,
  ): Promise<GenerationProviderResult>;
}
