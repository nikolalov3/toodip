"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canApprove, requireSession } from "@/lib/auth/session";
import {
  approveReview,
  archiveReview,
  assignReview,
  classifyExistingReview,
  generateReplies,
  ingestReview,
  publishReview,
  rejectReview,
  saveDraftEdit,
  selectDraft,
} from "@/services/reviews";

export interface ActionResult {
  ok: boolean;
  message: string;
  reviewId?: string;
}

const addReviewSchema = z.object({
  source: z.enum(["google", "facebook", "tripadvisor", "booking", "manual"]),
  reviewerName: z.string().trim().max(120).optional(),
  stars: z.coerce.number().int().min(1).max(5),
  reviewText: z.string().trim().min(10, "Paste the full review text."),
});

function refresh(reviewId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/reviews");
  revalidatePath("/queue");
  revalidatePath("/activity");
  if (reviewId) revalidatePath(`/reviews/${reviewId}`);
}

export async function addReviewAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = addReviewSchema.safeParse({
    source: formData.get("source"),
    reviewerName: formData.get("reviewerName") ?? undefined,
    stars: formData.get("stars"),
    reviewText: formData.get("reviewText"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  }

  const review = await ingestReview(
    {
      source: parsed.data.source,
      reviewerName: parsed.data.reviewerName?.trim() || null,
      stars: parsed.data.stars,
      reviewText: parsed.data.reviewText,
    },
    session,
  );

  refresh(review.id);
  return {
    ok: true,
    message: "Review added and triaged.",
    reviewId: review.id,
  };
}

export async function generateRepliesAction(
  reviewId: string,
  options: { regenerate?: boolean; draftCount?: number } = {},
): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const result = await generateReplies({ reviewId, ...options }, session);
    refresh(reviewId);
    return {
      ok: true,
      message: `${result.drafts.length} draft${result.drafts.length > 1 ? "s" : ""} ready in ${result.latencyMs} ms.`,
    };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function selectDraftAction(
  reviewId: string,
  draftId: string,
): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await selectDraft(reviewId, draftId, session);
    refresh(reviewId);
    return { ok: true, message: "Draft selected." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function saveDraftEditAction(
  reviewId: string,
  draftId: string,
  text: string,
): Promise<ActionResult> {
  const session = await requireSession();
  if (text.trim().length < 10) {
    return { ok: false, message: "The reply is too short to save." };
  }
  try {
    await saveDraftEdit(reviewId, draftId, text.trim(), session);
    refresh(reviewId);
    return { ok: true, message: "Edit saved as a new draft." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function approveAction(
  reviewId: string,
  options: { notes?: string; publish?: boolean } = {},
): Promise<ActionResult> {
  const session = await requireSession();
  if (!canApprove(session.role)) {
    return {
      ok: false,
      message: "Your role cannot approve replies. Ask a workspace admin.",
    };
  }
  try {
    await approveReview(reviewId, options, session);
    refresh(reviewId);
    return {
      ok: true,
      message: options.publish ? "Approved and published." : "Approved.",
    };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function rejectAction(
  reviewId: string,
  notes: string,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!canApprove(session.role)) {
    return { ok: false, message: "Your role cannot reject replies." };
  }
  try {
    await rejectReview(reviewId, notes, session);
    refresh(reviewId);
    return { ok: true, message: "Sent back for a rewrite." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function publishAction(reviewId: string): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await publishReview(reviewId, session);
    refresh(reviewId);
    return { ok: true, message: "Marked as published." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function archiveAction(reviewId: string): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await archiveReview(reviewId, session);
    refresh(reviewId);
    return { ok: true, message: "Review archived." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function assignAction(
  reviewId: string,
  userId: string | null,
): Promise<ActionResult> {
  await requireSession();
  try {
    await assignReview(reviewId, userId);
    refresh(reviewId);
    return { ok: true, message: userId ? "Assigned." : "Assignment cleared." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function reclassifyAction(
  reviewId: string,
): Promise<ActionResult> {
  const session = await requireSession();
  try {
    const review = await classifyExistingReview(reviewId, session);
    refresh(reviewId);
    return {
      ok: true,
      message: `Reclassified. Risk ${review.riskScore}, ${review.riskFlags.length} flag${
        review.riskFlags.length === 1 ? "" : "s"
      }.`,
    };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}
