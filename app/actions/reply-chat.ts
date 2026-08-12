"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { inferStarsFromText } from "@/services/classification";
import {
  generateReplies,
  ingestReview,
  publishReview,
  selectDraft,
} from "@/services/reviews";
import type { RiskFlagType, Sentiment } from "@/types/domain";

/**
 * The chat surface asks for one thing only: the pasted review text. Stars and
 * reviewer name are deliberately absent; the classifier infers sentiment and
 * the rating is stored as a flagged guess. Everything else rides the same
 * services as the form flow, so limits, quality checks and the approval gate
 * behave identically.
 */

export interface ChatReplyResult {
  ok: boolean;
  message?: string;
  reviewId?: string;
  draftId?: string;
  replyText?: string;
  sentiment?: Sentiment | null;
  stars?: number;
  requiresApproval?: boolean;
  riskFlags?: RiskFlagType[];
  provider?: string;
}

const chatInputSchema = z
  .string()
  .trim()
  .min(10, "Paste the full review text (at least 10 characters).")
  .max(5000, "That is longer than any review. Paste one review at a time.");

function refresh() {
  revalidatePath("/reply");
  revalidatePath("/reviews");
  revalidatePath("/queue");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
}

export async function chatReplyAction(
  reviewText: string,
): Promise<ChatReplyResult> {
  const session = await requireSession();
  const parsed = chatInputSchema.safeParse(reviewText);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  try {
    const review = await ingestReview(
      {
        source: "google",
        reviewerName: null,
        stars: inferStarsFromText(parsed.data),
        reviewText: parsed.data,
        ratingInferred: true,
      },
      session,
    );

    return await generateAndSelect(review.id, false, session);
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function chatRegenerateAction(
  reviewId: string,
): Promise<ChatReplyResult> {
  const session = await requireSession();
  try {
    return await generateAndSelect(reviewId, true, session);
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function chatMarkPastedAction(
  reviewId: string,
): Promise<ChatReplyResult> {
  const session = await requireSession();
  try {
    await publishReview(reviewId, session);
    refresh();
    return { ok: true, message: "Marked as published on Google." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

async function generateAndSelect(
  reviewId: string,
  regenerate: boolean,
  session: Awaited<ReturnType<typeof requireSession>>,
): Promise<ChatReplyResult> {
  // One reply per turn. The chat is a conversation, not a draft picker.
  const result = await generateReplies(
    { reviewId, draftCount: 1, regenerate },
    session,
  );

  const draft = result.drafts[0];
  if (!draft) {
    return { ok: false, message: "The engine returned no draft. Try again." };
  }

  // Selecting is what arms the pipeline: clean reviews auto-approve under
  // workspace policy (so "mark as pasted" can publish), flagged ones move to
  // pending_approval and show up in the queue.
  const review = await selectDraft(reviewId, draft.id, session);

  refresh();
  return {
    ok: true,
    reviewId,
    draftId: draft.id,
    replyText: draft.draftText,
    sentiment: review.sentiment,
    stars: review.stars,
    requiresApproval: review.requiresApproval,
    riskFlags: review.riskFlags.map((flag) => flag.flagType),
    provider: result.provider.label,
  };
}
