import type {
  ActivityLog,
  BrandVoiceExample,
  BusinessProfile,
  KeywordBankItem,
  MemberRole,
  Review,
  ReviewApproval,
  ReviewDraft,
  ReviewRiskFlag,
  ReviewSource,
  ReviewStatus,
  ReviewWithContext,
  Sentiment,
  Tenant,
} from "@/types/domain";

export type RiskLevel = "none" | "low" | "medium" | "high";

export type ReviewSort =
  | "newest"
  | "oldest"
  | "risk"
  | "stars_asc"
  | "stars_desc";

export interface ReviewFilters {
  search?: string;
  stars?: number[];
  statuses?: ReviewStatus[];
  sentiments?: Sentiment[];
  sources?: ReviewSource[];
  riskLevels?: RiskLevel[];
  /** "yes" keeps reviews that already have at least one draft. */
  hasDrafts?: "yes" | "no";
  approval?: "required" | "not_required";
  assignedTo?: string;
  sort?: ReviewSort;
}

export interface MemberWithProfile {
  userId: string;
  fullName: string;
  email: string;
  initials: string;
  role: MemberRole;
  jobTitle: string | null;
  joinedAt: string;
}

export type NewReviewInput = Pick<
  Review,
  "source" | "reviewerName" | "stars" | "reviewText" | "language"
> & {
  reviewedAt?: string;
  externalId?: string | null;
  ratingInferred?: boolean;
};

export type NewDraftInput = Omit<ReviewDraft, "id" | "reviewId" | "createdAt">;

/**
 * Everything the services layer is allowed to do with persistence.
 *
 * The demo adapter satisfies this today. A Supabase adapter implements the same
 * surface and gets selected in `lib/repositories/index.ts`, so no screen, route
 * or service changes when the database goes live.
 */
export interface DataRepository {
  getTenant(): Promise<Tenant>;
  listMembers(): Promise<MemberWithProfile[]>;

  getBusinessProfile(): Promise<BusinessProfile>;
  updateBusinessProfile(
    patch: Partial<Omit<BusinessProfile, "id" | "tenantId" | "createdAt">>,
  ): Promise<BusinessProfile>;

  listKeywordItems(): Promise<KeywordBankItem[]>;
  replaceKeywordItems(
    items: Array<Pick<KeywordBankItem, "phrase" | "type" | "active">>,
  ): Promise<KeywordBankItem[]>;
  /** Called when a reply using the phrase goes live. Spreads phrases over time. */
  incrementKeywordUsage(phrase: string): Promise<void>;

  listBrandVoiceExamples(): Promise<BrandVoiceExample[]>;
  replaceBrandVoiceExamples(
    items: Array<Pick<BrandVoiceExample, "exampleType" | "content">>,
  ): Promise<BrandVoiceExample[]>;

  listReviews(filters?: ReviewFilters): Promise<ReviewWithContext[]>;
  getReview(reviewId: string): Promise<ReviewWithContext | null>;
  createReview(input: NewReviewInput): Promise<Review>;
  updateReview(reviewId: string, patch: Partial<Review>): Promise<Review>;

  replaceRiskFlags(
    reviewId: string,
    flags: Array<Omit<ReviewRiskFlag, "id" | "reviewId" | "createdAt">>,
  ): Promise<ReviewRiskFlag[]>;

  addDrafts(reviewId: string, drafts: NewDraftInput[]): Promise<ReviewDraft[]>;
  updateDraft(
    draftId: string,
    patch: Partial<ReviewDraft>,
  ): Promise<ReviewDraft>;
  selectDraft(reviewId: string, draftId: string): Promise<ReviewDraft>;

  addApproval(
    input: Omit<ReviewApproval, "id" | "createdAt">,
  ): Promise<ReviewApproval>;

  listActivity(options?: {
    limit?: number;
    entityId?: string;
  }): Promise<ActivityLog[]>;
  logActivity(
    input: Omit<ActivityLog, "id" | "tenantId" | "createdAt">,
  ): Promise<ActivityLog>;

  /** Demo only. Restores the seeded workspace. */
  reset(): Promise<void>;
}
