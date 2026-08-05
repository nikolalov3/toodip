import "server-only";

import { mutateDataset, readDataset, resetDataset } from "@/lib/demo/store";
import { DEMO_TENANT_ID } from "@/lib/demo/seed";
import {
  matchesFilters,
  sortReviews,
} from "@/lib/repositories/review-query";
import type {
  ActivityLog,
  BrandVoiceExample,
  BusinessProfile,
  KeywordBankItem,
  Review,
  ReviewApproval,
  ReviewDraft,
  ReviewRiskFlag,
  ReviewWithContext,
  Tenant,
} from "@/types/domain";
import type {
  DataRepository,
  MemberWithProfile,
  NewDraftInput,
  NewReviewInput,
  ReviewFilters,
} from "@/types/repository";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

/**
 * Demo persistence adapter. Same surface as the future Supabase adapter, so the
 * services layer never learns which one it is talking to.
 */
export function createDemoRepository(sessionId: string): DataRepository {
  const tenantId = DEMO_TENANT_ID;

  async function requireBusinessProfile(): Promise<BusinessProfile> {
    const dataset = await readDataset(sessionId);
    const profile = dataset.businessProfiles.find(
      (item) => item.tenantId === tenantId,
    );
    if (!profile) throw new Error("Business profile missing from demo dataset");
    return profile;
  }

  function hydrate(
    review: Review,
    flags: ReviewRiskFlag[],
    drafts: ReviewDraft[],
    approvals: ReviewApproval[],
  ): ReviewWithContext {
    const reviewDrafts = drafts
      .filter((draft) => draft.reviewId === review.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      ...review,
      riskFlags: flags.filter((flag) => flag.reviewId === review.id),
      drafts: reviewDrafts,
      approvals: approvals
        .filter((approval) => approval.reviewId === review.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      selectedDraft: reviewDrafts.find((draft) => draft.selected) ?? null,
    };
  }

  return {
    async getTenant(): Promise<Tenant> {
      const dataset = await readDataset(sessionId);
      const tenant = dataset.tenants.find((item) => item.id === tenantId);
      if (!tenant) throw new Error("Tenant missing from demo dataset");
      return tenant;
    },

    async listMembers(): Promise<MemberWithProfile[]> {
      const dataset = await readDataset(sessionId);
      return dataset.members
        .filter((member) => member.tenantId === tenantId)
        .map((member) => {
          const profile = dataset.profiles.find(
            (item) => item.userId === member.userId,
          );
          return {
            userId: member.userId,
            fullName: profile?.fullName ?? "Unknown user",
            email: profile?.email ?? "",
            initials: profile?.avatarInitials ?? "??",
            role: member.role,
            jobTitle: member.jobTitle,
            joinedAt: member.createdAt,
          };
        });
    },

    getBusinessProfile: requireBusinessProfile,

    async updateBusinessProfile(patch): Promise<BusinessProfile> {
      return mutateDataset(sessionId, (dataset) => {
        const profile = dataset.businessProfiles.find(
          (item) => item.tenantId === tenantId,
        );
        if (!profile) throw new Error("Business profile missing");
        Object.assign(profile, patch, {
          updatedAt: new Date().toISOString(),
        });
        return { ...profile };
      });
    },

    async listKeywordItems(): Promise<KeywordBankItem[]> {
      const dataset = await readDataset(sessionId);
      const profile = await requireBusinessProfile();
      return dataset.keywordItems.filter(
        (item) => item.businessProfileId === profile.id,
      );
    },

    async replaceKeywordItems(items): Promise<KeywordBankItem[]> {
      const profile = await requireBusinessProfile();
      return mutateDataset(sessionId, (dataset) => {
        const previous = new Map(
          dataset.keywordItems
            .filter((item) => item.businessProfileId === profile.id)
            .map((item) => [item.phrase.toLowerCase(), item]),
        );
        const next: KeywordBankItem[] = items.map((item) => {
          const existing = previous.get(item.phrase.toLowerCase());
          return {
            id: existing?.id ?? uid("kw"),
            businessProfileId: profile.id,
            phrase: item.phrase,
            type: item.type,
            active: item.active,
            usageCount: existing?.usageCount ?? 0,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
          };
        });
        dataset.keywordItems = [
          ...dataset.keywordItems.filter(
            (item) => item.businessProfileId !== profile.id,
          ),
          ...next,
        ];
        return next;
      });
    },

    async incrementKeywordUsage(phrase: string): Promise<void> {
      await mutateDataset(sessionId, (dataset) => {
        const item = dataset.keywordItems.find(
          (candidate) => candidate.phrase === phrase,
        );
        if (item) item.usageCount += 1;
      });
    },

    async listBrandVoiceExamples(): Promise<BrandVoiceExample[]> {
      const dataset = await readDataset(sessionId);
      const profile = await requireBusinessProfile();
      return dataset.brandVoiceExamples.filter(
        (item) => item.businessProfileId === profile.id,
      );
    },

    async replaceBrandVoiceExamples(items): Promise<BrandVoiceExample[]> {
      const profile = await requireBusinessProfile();
      return mutateDataset(sessionId, (dataset) => {
        const next: BrandVoiceExample[] = items.map((item) => ({
          id: uid("voice"),
          businessProfileId: profile.id,
          exampleType: item.exampleType,
          content: item.content,
          createdAt: new Date().toISOString(),
        }));
        dataset.brandVoiceExamples = [
          ...dataset.brandVoiceExamples.filter(
            (item) => item.businessProfileId !== profile.id,
          ),
          ...next,
        ];
        return next;
      });
    },

    async listReviews(filters: ReviewFilters = {}): Promise<
      ReviewWithContext[]
    > {
      const dataset = await readDataset(sessionId);
      const hydrated = dataset.reviews
        .filter((review) => review.tenantId === tenantId)
        .map((review) =>
          hydrate(review, dataset.riskFlags, dataset.drafts, dataset.approvals),
        );

      return sortReviews(
        hydrated.filter((review) => matchesFilters(review, filters)),
        filters.sort,
      );
    },

    async getReview(reviewId: string): Promise<ReviewWithContext | null> {
      const dataset = await readDataset(sessionId);
      const review = dataset.reviews.find(
        (item) => item.id === reviewId && item.tenantId === tenantId,
      );
      if (!review) return null;
      return hydrate(
        review,
        dataset.riskFlags,
        dataset.drafts,
        dataset.approvals,
      );
    },

    async createReview(input: NewReviewInput): Promise<Review> {
      const profile = await requireBusinessProfile();
      return mutateDataset(sessionId, (dataset) => {
        const now = new Date().toISOString();
        const review: Review = {
          id: uid("review"),
          tenantId,
          businessProfileId: profile.id,
          source: input.source,
          externalId: input.externalId ?? null,
          reviewerName: input.reviewerName,
          stars: input.stars,
          reviewText: input.reviewText,
          language: input.language,
          sentiment: null,
          riskScore: 0,
          status: "new",
          requiresApproval: false,
          assignedTo: null,
          publishedReply: null,
          publishedAt: null,
          reviewedAt: input.reviewedAt ?? now,
          createdAt: now,
          updatedAt: now,
        };
        dataset.reviews.unshift(review);
        return review;
      });
    },

    async updateReview(reviewId, patch): Promise<Review> {
      return mutateDataset(sessionId, (dataset) => {
        const review = dataset.reviews.find(
          (item) => item.id === reviewId && item.tenantId === tenantId,
        );
        if (!review) throw new Error(`Review ${reviewId} not found`);
        Object.assign(review, patch, { updatedAt: new Date().toISOString() });
        return { ...review };
      });
    },

    async replaceRiskFlags(reviewId, flags): Promise<ReviewRiskFlag[]> {
      return mutateDataset(sessionId, (dataset) => {
        const now = new Date().toISOString();
        const next: ReviewRiskFlag[] = flags.map((flag, index) => ({
          id: `${reviewId}-flag-${index + 1}`,
          reviewId,
          flagType: flag.flagType,
          severity: flag.severity,
          evidence: flag.evidence,
          createdAt: now,
        }));
        dataset.riskFlags = [
          ...dataset.riskFlags.filter((flag) => flag.reviewId !== reviewId),
          ...next,
        ];
        return next;
      });
    },

    async addDrafts(
      reviewId: string,
      drafts: NewDraftInput[],
    ): Promise<ReviewDraft[]> {
      return mutateDataset(sessionId, (dataset) => {
        const now = new Date().toISOString();
        const created: ReviewDraft[] = drafts.map((draft) => ({
          ...draft,
          id: uid("draft"),
          reviewId,
          createdAt: now,
        }));
        dataset.drafts.push(...created);
        return created;
      });
    },

    async updateDraft(draftId, patch): Promise<ReviewDraft> {
      return mutateDataset(sessionId, (dataset) => {
        const draft = dataset.drafts.find((item) => item.id === draftId);
        if (!draft) throw new Error(`Draft ${draftId} not found`);
        Object.assign(draft, patch);
        return { ...draft };
      });
    },

    async selectDraft(reviewId, draftId): Promise<ReviewDraft> {
      return mutateDataset(sessionId, (dataset) => {
        let selected: ReviewDraft | undefined;
        for (const draft of dataset.drafts) {
          if (draft.reviewId !== reviewId) continue;
          draft.selected = draft.id === draftId;
          if (draft.selected) selected = draft;
        }
        if (!selected) throw new Error(`Draft ${draftId} not found`);
        return { ...selected };
      });
    },

    async addApproval(input): Promise<ReviewApproval> {
      return mutateDataset(sessionId, (dataset) => {
        const approval: ReviewApproval = {
          ...input,
          id: uid("approval"),
          createdAt: new Date().toISOString(),
        };
        dataset.approvals.push(approval);
        return approval;
      });
    },

    async listActivity(options = {}): Promise<ActivityLog[]> {
      const dataset = await readDataset(sessionId);
      const entries = dataset.activity
        .filter((entry) => entry.tenantId === tenantId)
        .filter((entry) =>
          options.entityId ? entry.entityId === options.entityId : true,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return options.limit ? entries.slice(0, options.limit) : entries;
    },

    async logActivity(input): Promise<ActivityLog> {
      return mutateDataset(sessionId, (dataset) => {
        const entry: ActivityLog = {
          ...input,
          id: uid("activity"),
          tenantId,
          createdAt: new Date().toISOString(),
        };
        dataset.activity.unshift(entry);
        return entry;
      });
    },

    async reset(): Promise<void> {
      await resetDataset(sessionId);
    },
  };
}
