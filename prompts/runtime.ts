import { riskFlagLabels, sourceLabels } from "@/lib/labels";
import type { ReviewRiskFlag, ReviewWithContext } from "@/types/domain";

/**
 * Layer 3 of the prompt: this specific review, right now, plus the shape of the
 * output we want back.
 */

export interface RuntimePromptInput {
  review: ReviewWithContext;
  riskFlags: ReviewRiskFlag[];
  draftCount: number;
  /** Drafts already shown to the operator. Used to force a different angle. */
  previousDrafts: string[];
  jsonMode: boolean;
}

export function buildRuntimePrompt({
  review,
  riskFlags,
  draftCount,
  previousDrafts,
  jsonMode,
}: RuntimePromptInput): string {
  const flagLines = riskFlags.length
    ? riskFlags
        .map(
          (flag) =>
            `- ${riskFlagLabels[flag.flagType]} (${flag.severity})${
              flag.evidence ? `: "${flag.evidence}"` : ""
            }`,
        )
        .join("\n")
    : "- none";

  const avoidBlock = previousDrafts.length
    ? `\nALREADY SHOWN TO THE OPERATOR, take a different angle and do not reuse these openings\n${previousDrafts
        .map((text) => `- "${text}"`)
        .join("\n")}`
    : "";

  const output = jsonMode
    ? `Return JSON only: {"drafts":[{"text":"...","rationale":"...","keywordUsed":null}]} with exactly ${draftCount} entries.`
    : draftCount === 1
      ? "Return the reply text only."
      : `Return exactly ${draftCount} replies, separated by a line containing only ---. No numbering, no labels.`;

  return `REVIEW
Source: ${sourceLabels[review.source]}
Rating: ${review.stars} of 5
Reviewer: ${review.reviewerName ?? "anonymous, do not invent a name"}
Language: ${review.language}
Date: ${review.reviewedAt.slice(0, 10)}
Text: "${review.reviewText}"

RISK FLAGS
${flagLines}${avoidBlock}

TASK
Write ${draftCount === 1 ? "one reply" : `${draftCount} distinct replies`} that follow every rule above.
${output}`;
}
