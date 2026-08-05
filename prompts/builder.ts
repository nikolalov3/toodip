import {
  PROMPT_VERSION,
  RISK_PROMPT_FRAGMENTS,
  SYSTEM_PROMPT,
} from "@/prompts/system";
import { buildTenantPrompt, type TenantPromptInput } from "@/prompts/tenant";
import { buildRuntimePrompt } from "@/prompts/runtime";
import type { ReviewWithContext } from "@/types/domain";

/**
 * Composes the three prompt layers into one assembled object.
 *
 * The result is what Prompt Studio renders, what the provider sends and what we
 * store next to every draft. Keeping it as data rather than a string means the
 * debug view never drifts from what the model actually received.
 */

export interface PromptBuildInput extends TenantPromptInput {
  review: ReviewWithContext;
  draftCount?: number;
  previousDrafts?: string[];
  jsonMode?: boolean;
}

export interface AssembledPrompt {
  version: string;
  system: string;
  tenant: string;
  runtime: string;
  riskAddendum: string;
  /** Chat message array, ready for any chat completions style API. */
  messages: Array<{ role: "system" | "user"; content: string }>;
  meta: {
    reviewId: string;
    draftCount: number;
    jsonMode: boolean;
    riskFlagTypes: string[];
    approxTokens: number;
  };
}

/** Rough character based estimate. Good enough for a budget indicator. */
function approximateTokens(text: string): number {
  return Math.ceil(text.length / 3.6);
}

export function buildPrompt(input: PromptBuildInput): AssembledPrompt {
  const draftCount = Math.min(Math.max(input.draftCount ?? 2, 1), 3);
  const jsonMode = input.jsonMode ?? false;
  const riskFlags = input.review.riskFlags;

  const riskAddendum = riskFlags.length
    ? `RISK HANDLING FOR THIS REVIEW\n${riskFlags
        .map((flag) => `- ${RISK_PROMPT_FRAGMENTS[flag.flagType] ?? ""}`)
        .filter((line) => line.trim() !== "-")
        .join("\n")}`
    : "";

  const tenant = buildTenantPrompt(input);
  const runtime = buildRuntimePrompt({
    review: input.review,
    riskFlags,
    draftCount,
    previousDrafts: input.previousDrafts ?? [],
    jsonMode,
  });

  const systemContent = [SYSTEM_PROMPT, tenant, riskAddendum]
    .filter(Boolean)
    .join("\n\n");

  return {
    version: PROMPT_VERSION,
    system: SYSTEM_PROMPT,
    tenant,
    runtime,
    riskAddendum,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: runtime },
    ],
    meta: {
      reviewId: input.review.id,
      draftCount,
      jsonMode,
      riskFlagTypes: riskFlags.map((flag) => flag.flagType),
      approxTokens: approximateTokens(`${systemContent}\n${runtime}`),
    },
  };
}
