import { z } from "zod";

import { handleError, ok, parseJson, requireApiSession } from "@/lib/api";
import { generateReplies } from "@/services/reviews";

const schema = z.object({
  reviewId: z.string().min(1),
  draftCount: z.number().int().min(1).max(3).optional(),
  regenerate: z.boolean().optional(),
  /** Returns the assembled prompt with the drafts. Debug surfaces use it. */
  includePrompt: z.boolean().optional(),
});

/**
 * POST /api/reviews/generate-reply
 *
 * Validates, loads the business profile, assembles the prompt, calls the active
 * generation provider, scores and stores the drafts, then returns them.
 */
export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJson(request, schema);
  if ("response" in parsed) return parsed.response;

  try {
    const result = await generateReplies(
      {
        reviewId: parsed.data.reviewId,
        draftCount: parsed.data.draftCount,
        regenerate: parsed.data.regenerate,
      },
      auth.session,
    );

    return ok({
      drafts: result.drafts,
      provider: result.provider,
      latencyMs: result.latencyMs,
      usage: result.usage,
      promptVersion: result.prompt.version,
      prompt: parsed.data.includePrompt ? result.prompt : undefined,
    });
  } catch (error) {
    return handleError(error);
  }
}
