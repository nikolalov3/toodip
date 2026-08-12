import "server-only";

import type { Session } from "@/lib/auth/session";
import { checkRateLimit, generationRateLimit } from "@/lib/rate-limit";
import { getRepository } from "@/lib/repositories";
import { buildPrompt, type AssembledPrompt } from "@/prompts/builder";
import { classifyReview, detectLanguage } from "@/services/classification";
import {
  getGenerationProvider,
  getGenerationProviderById,
} from "@/services/generation";
import {
  evaluateDraft,
  type QualityResult,
} from "@/services/generation/quality";
import { getBillingSnapshot } from "@/services/billing";
import { logIntervention } from "@/services/visibility";
import type {
  Review,
  ReviewDraft,
  ReviewSource,
  ReviewWithContext,
} from "@/types/domain";
import type {
  DataRepository,
  NewDraftInput,
  ReviewFilters,
} from "@/types/repository";

/**
 * Operations layer. Every screen and every route goes through these functions,
 * never straight to the repository, so status transitions, the approval gate
 * and the audit trail stay in one place.
 */

export async function listReviews(
  filters: ReviewFilters = {},
): Promise<ReviewWithContext[]> {
  const repo = await getRepository();
  return repo.listReviews(filters);
}

export async function getReview(id: string): Promise<ReviewWithContext | null> {
  const repo = await getRepository();
  return repo.getReview(id);
}

export interface IngestReviewInput {
  source: ReviewSource;
  reviewerName: string | null;
  stars: number;
  reviewText: string;
  language?: string;
  reviewedAt?: string;
}

/** Adds a review and immediately triages it. */
export async function ingestReview(
  input: IngestReviewInput,
  session: Session,
): Promise<ReviewWithContext> {
  const repo = await getRepository();

  const review = await repo.createReview({
    source: input.source,
    reviewerName: input.reviewerName,
    stars: input.stars,
    reviewText: input.reviewText,
    language: input.language ?? detectLanguage(input.reviewText),
    reviewedAt: input.reviewedAt,
    externalId: null,
  });

  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "review",
    entityId: review.id,
    action: "review.created",
    metadata: { source: input.source, stars: input.stars },
  });

  return classifyExistingReview(review.id, session);
}

export async function classifyExistingReview(
  reviewId: string,
  session: Session,
): Promise<ReviewWithContext> {
  const repo = await getRepository();
  const review = await repo.getReview(reviewId);
  if (!review) throw new Error(`Review ${reviewId} not found`);
  const profile = await repo.getBusinessProfile();

  const result = classifyReview({
    reviewText: review.reviewText,
    stars: review.stars,
    language: review.language,
    reviewerName: review.reviewerName,
    approvalSettings: profile.approvalSettings,
  });

  await repo.replaceRiskFlags(reviewId, result.flags);
  await repo.updateReview(reviewId, {
    sentiment: result.sentiment,
    language: result.language,
    riskScore: result.riskScore,
    requiresApproval: result.requiresApproval,
  });

  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "review",
    entityId: reviewId,
    action: "review.classified",
    metadata: {
      sentiment: result.sentiment,
      riskScore: result.riskScore,
      flags: result.flags.map((flag) => flag.flagType),
    },
  });

  const updated = await repo.getReview(reviewId);
  if (!updated) throw new Error(`Review ${reviewId} vanished during classify`);
  return updated;
}

export interface ReviewWorkspace {
  review: ReviewWithContext;
  profile: Awaited<ReturnType<DataRepository["getBusinessProfile"]>>;
  keywords: Awaited<ReturnType<DataRepository["listKeywordItems"]>>;
  members: Awaited<ReturnType<DataRepository["listMembers"]>>;
  activity: Awaited<ReturnType<DataRepository["listActivity"]>>;
  /** Quality verdict per draft, recomputed so it always matches the rules. */
  quality: Record<string, QualityResult>;
  /** Why this review does or does not need a human. */
  approvalReasons: string[];
  prompt: AssembledPrompt;
}

/** One fetch for the review detail surface, drawer and page alike. */
export async function getReviewWorkspace(
  reviewId: string,
): Promise<ReviewWorkspace | null> {
  const repo = await getRepository();
  const review = await repo.getReview(reviewId);
  if (!review) return null;

  const [profile, keywords, brandVoice, members, activity] = await Promise.all([
    repo.getBusinessProfile(),
    repo.listKeywordItems(),
    repo.listBrandVoiceExamples(),
    repo.listMembers(),
    repo.listActivity({ entityId: reviewId }),
  ]);

  const quality: Record<string, QualityResult> = {};
  for (const draft of review.drafts) {
    quality[draft.id] = evaluateDraft({
      text: draft.draftText,
      review,
      profile,
      keywords,
    });
  }

  const classification = classifyReview({
    reviewText: review.reviewText,
    stars: review.stars,
    language: review.language,
    reviewerName: review.reviewerName,
    approvalSettings: profile.approvalSettings,
  });

  const prompt = buildPrompt({
    review,
    profile,
    keywords,
    brandVoice,
    draftCount: profile.approvalSettings.draftsPerGeneration,
    jsonMode: getGenerationProvider().wantsJsonMode ?? false,
  });

  return {
    review,
    profile,
    keywords,
    members,
    activity,
    quality,
    approvalReasons: classification.reasons,
    prompt,
  };
}

export interface GenerateRepliesInput {
  reviewId: string;
  draftCount?: number;
  /** Ignores existing drafts and asks for a different angle. */
  regenerate?: boolean;
  jsonMode?: boolean;
}

export interface GenerateRepliesResult {
  drafts: ReviewDraft[];
  prompt: AssembledPrompt;
  provider: { id: string; label: string; offline: boolean };
  latencyMs: number;
  usage: { promptTokens: number | null; completionTokens: number | null };
}

export async function generateReplies(
  input: GenerateRepliesInput,
  session: Session,
): Promise<GenerateRepliesResult> {
  const repo = await getRepository();
  const review = await repo.getReview(input.reviewId);
  if (!review) throw new Error(`Review ${input.reviewId} not found`);

  const [profile, keywords, brandVoice] = await Promise.all([
    repo.getBusinessProfile(),
    repo.listKeywordItems(),
    repo.listBrandVoiceExamples(),
  ]);

  const draftCount =
    input.draftCount ?? profile.approvalSettings.draftsPerGeneration;
  const previousDrafts = input.regenerate
    ? review.drafts.map((draft) => draft.draftText)
    : [];

  // Plan limits gate generation, and the plan picks the engine: free runs the
  // offline draft engine, paid plans get the AI model.
  const billing = await getBillingSnapshot();
  if (!billing.canGenerate) {
    throw new Error(billing.blockedMessage ?? "Plan limit reached.");
  }

  // The provider decides the output contract, so the stored prompt is exactly
  // what the engine received.
  const provider = billing.allowAi
    ? getGenerationProvider()
    : getGenerationProviderById("mock")!;

  // Only paid engines are worth limiting, and only against the caller's own
  // session. A brake on runaway loops and impatient clicking, nothing more.
  if (!provider.offline) {
    const limit = generationRateLimit();
    const verdict = checkRateLimit(
      `generate:${session.tenantId}:${session.userId}`,
      limit,
      60 * 60 * 1000,
    );
    if (!verdict.allowed) {
      throw new Error(
        `Generation limit reached: ${limit} per hour on this workspace. Try again in ${Math.ceil(
          verdict.retryAfterSeconds / 60,
        )} minutes.`,
      );
    }
  }

  const prompt = buildPrompt({
    review,
    profile,
    keywords,
    brandVoice,
    draftCount,
    previousDrafts,
    jsonMode: input.jsonMode ?? provider.wantsJsonMode ?? false,
  });

  const result = await provider.generate(prompt, {
    review,
    profile,
    keywords,
    brandVoice,
    draftCount,
    previousDrafts,
  });

  const payload: NewDraftInput[] = result.drafts.map((draft) => {
    const quality = evaluateDraft({
      text: draft.text,
      review,
      profile,
      keywords,
    });
    return {
      model: result.model,
      promptVersion: prompt.version,
      draftText: draft.text,
      qualityScore: quality.score,
      selected: false,
      rationale: draft.rationale,
      safetyTags: quality.safetyTags,
      keywordUsed: draft.keywordUsed,
      editedFromDraftId: null,
      createdBy: session.userId,
    };
  });

  const created = await repo.addDrafts(review.id, payload);

  if (review.status === "new") {
    await repo.updateReview(review.id, { status: "draft_generated" });
  }

  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "review_draft",
    entityId: review.id,
    action: "draft.generated",
    metadata: {
      count: created.length,
      model: result.model,
      promptVersion: prompt.version,
      regenerated: Boolean(input.regenerate),
    },
  });

  return {
    drafts: created,
    prompt,
    provider: {
      id: provider.id,
      label: provider.label,
      offline: provider.offline,
    },
    latencyMs: result.latencyMs,
    usage: result.usage,
  };
}

export async function selectDraft(
  reviewId: string,
  draftId: string,
  session: Session,
): Promise<ReviewWithContext> {
  const repo = await getRepository();
  const review = await repo.getReview(reviewId);
  if (!review) throw new Error(`Review ${reviewId} not found`);

  await repo.selectDraft(reviewId, draftId);

  const nextStatus: Review["status"] = review.requiresApproval
    ? "pending_approval"
    : "approved";

  await repo.updateReview(reviewId, { status: nextStatus });

  if (!review.requiresApproval) {
    // Clean high ratings are approved by policy, and the record says so.
    await repo.addApproval({
      reviewId,
      draftId,
      decision: "approved",
      approvedBy: session.userId,
      notes: "Auto approved by workspace policy.",
    });
  }

  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "review_draft",
    entityId: reviewId,
    action: "draft.selected",
    metadata: { draftId, autoApproved: !review.requiresApproval },
  });

  return requireReview(reviewId);
}

/** Saves an operator edit as a new draft so the original stays auditable. */
export async function saveDraftEdit(
  reviewId: string,
  draftId: string,
  text: string,
  session: Session,
): Promise<ReviewWithContext> {
  const repo = await getRepository();
  const review = await repo.getReview(reviewId);
  if (!review) throw new Error(`Review ${reviewId} not found`);
  const source = review.drafts.find((draft) => draft.id === draftId);
  if (!source) throw new Error(`Draft ${draftId} not found`);

  const [profile, keywords] = await Promise.all([
    repo.getBusinessProfile(),
    repo.listKeywordItems(),
  ]);

  const quality = evaluateDraft({ text, review, profile, keywords });

  const [created] = await repo.addDrafts(reviewId, [
    {
      model: `${source.model} + human edit`,
      promptVersion: source.promptVersion,
      draftText: text,
      qualityScore: quality.score,
      selected: false,
      rationale: "Edited by an operator before approval.",
      safetyTags: quality.safetyTags,
      keywordUsed: source.keywordUsed,
      editedFromDraftId: source.id,
      createdBy: session.userId,
    },
  ]);

  await repo.selectDraft(reviewId, created.id);
  await repo.updateReview(reviewId, {
    status: review.requiresApproval ? "pending_approval" : "approved",
  });

  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "review_draft",
    entityId: reviewId,
    action: "draft.edited",
    metadata: { from: source.id, to: created.id },
  });

  return requireReview(reviewId);
}

export async function approveReview(
  reviewId: string,
  options: { notes?: string; publish?: boolean },
  session: Session,
): Promise<ReviewWithContext> {
  const repo = await getRepository();
  const review = await repo.getReview(reviewId);
  if (!review) throw new Error(`Review ${reviewId} not found`);

  const draft = review.selectedDraft ?? review.drafts[0];
  if (!draft) {
    throw new Error("Nothing to approve. Generate a reply first.");
  }

  if (!review.selectedDraft) await repo.selectDraft(reviewId, draft.id);

  await repo.addApproval({
    reviewId,
    draftId: draft.id,
    decision: "approved",
    approvedBy: session.userId,
    notes: options.notes?.trim() || null,
  });

  await repo.updateReview(reviewId, { status: "approved" });

  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "review",
    entityId: reviewId,
    action: "review.approved",
    metadata: { draftId: draft.id, notes: options.notes ?? null },
  });

  if (options.publish) return publishReview(reviewId, session);
  return requireReview(reviewId);
}

export async function rejectReview(
  reviewId: string,
  notes: string,
  session: Session,
): Promise<ReviewWithContext> {
  const repo = await getRepository();
  const review = await repo.getReview(reviewId);
  if (!review) throw new Error(`Review ${reviewId} not found`);

  await repo.addApproval({
    reviewId,
    draftId: review.selectedDraft?.id ?? null,
    decision: "rejected",
    approvedBy: session.userId,
    notes: notes.trim() || null,
  });

  await repo.updateReview(reviewId, { status: "rejected" });

  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "review",
    entityId: reviewId,
    action: "review.rejected",
    metadata: { notes },
  });

  return requireReview(reviewId);
}

export async function publishReview(
  reviewId: string,
  session: Session,
): Promise<ReviewWithContext> {
  const repo = await getRepository();
  const review = await repo.getReview(reviewId);
  if (!review) throw new Error(`Review ${reviewId} not found`);
  const profile = await repo.getBusinessProfile();

  const draft = review.selectedDraft;
  if (!draft) throw new Error("Select a draft before publishing.");

  const approved = review.approvals.some(
    (approval) => approval.decision === "approved",
  );
  if (profile.approvalSettings.requireApprovalBeforePublish && !approved) {
    throw new Error("Workspace policy requires an approval before publishing.");
  }

  await repo.updateReview(reviewId, {
    status: "published",
    publishedReply: draft.draftText,
    publishedAt: new Date().toISOString(),
  });

  // Keyword usage feeds back into the next generation, which spreads phrases
  // across replies instead of repeating the same one.
  if (draft.keywordUsed) {
    await repo.incrementKeywordUsage(draft.keywordUsed);
  }

  // Every published reply is an intervention on the venue's highest authority
  // surface. Recording it is what later ties movement to causes.
  await logIntervention({
    kind: "review_reply",
    surface: "google",
    description: `Published a reply to ${review.reviewerName ?? "an anonymous reviewer"} (${review.stars} stars)${
      draft.keywordUsed ? `, phrase: ${draft.keywordUsed}` : ""
    }.`,
    metadata: { reviewId, draftId: draft.id, keyword: draft.keywordUsed },
  });

  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "review",
    entityId: reviewId,
    action: "review.published",
    metadata: { draftId: draft.id, source: review.source },
  });

  return requireReview(reviewId);
}

export async function archiveReview(
  reviewId: string,
  session: Session,
): Promise<ReviewWithContext> {
  const repo = await getRepository();
  await repo.updateReview(reviewId, { status: "archived" });
  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "review",
    entityId: reviewId,
    action: "review.archived",
    metadata: {},
  });
  return requireReview(reviewId);
}

export async function assignReview(
  reviewId: string,
  userId: string | null,
): Promise<ReviewWithContext> {
  const repo = await getRepository();
  await repo.updateReview(reviewId, { assignedTo: userId });
  return requireReview(reviewId);
}

async function requireReview(reviewId: string): Promise<ReviewWithContext> {
  const repo = await getRepository();
  const review = await repo.getReview(reviewId);
  if (!review) throw new Error(`Review ${reviewId} not found`);
  return review;
}
