/**
 * Domain model for Review Reply Assistant.
 *
 * These types are the contract between the UI, the services layer and whichever
 * persistence adapter is active (demo store today, Supabase later). Table and
 * column names in `supabase/migrations` mirror these shapes one to one.
 */

export type MemberRole = "platform_admin" | "tenant_admin" | "tenant_member";

export type BusinessCategory =
  | "cafe"
  | "restaurant"
  | "bakery"
  | "bar"
  | "hotel"
  | "beauty"
  | "clinic"
  | "trades"
  | "other";

export type ReviewSource =
  | "google"
  | "facebook"
  | "tripadvisor"
  | "booking"
  | "manual";

export type ReviewStatus =
  | "new"
  | "draft_generated"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "published"
  | "archived";

export type Sentiment = "positive" | "neutral" | "mixed" | "negative";

export type RiskFlagType =
  | "staff_named"
  | "complaint"
  | "refund_issue"
  | "legal_threat"
  | "health_safety"
  | "competitor_mention"
  | "offensive_language"
  | "likely_fake"
  | "unclear_sentiment";

export type RiskSeverity = "low" | "medium" | "high";

export type ToneKey =
  | "warm_professional"
  | "concise_professional"
  | "friendly_casual"
  | "formal";

export type KeywordType = "local" | "service" | "product" | "brand";

/**
 * How much personality a reply is allowed to show in punctuation.
 * "match_reviewer" only uses an emoji when the reviewer used one first, which
 * is the safest way to sound human without sounding junior.
 */
export type EmojiPolicy = "never" | "sparing" | "match_reviewer";

export type BrandVoiceExampleType =
  | "positive_reply"
  | "neutral_reply"
  | "negative_reply"
  | "tone_descriptor"
  | "phrase_to_prefer"
  | "phrase_to_avoid";

export type ApprovalDecision = "approved" | "rejected";

export type ActivityAction =
  | "review.created"
  | "review.classified"
  | "review.archived"
  | "draft.generated"
  | "draft.selected"
  | "draft.edited"
  | "review.approved"
  | "review.rejected"
  | "review.published"
  | "business_profile.updated"
  | "keyword_bank.updated"
  | "brand_voice.updated"
  | "member.invited"
  | "demo.reset";

export type ActivityEntityType =
  | "review"
  | "review_draft"
  | "business_profile"
  | "keyword_bank"
  | "brand_voice"
  | "tenant"
  | "member";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "trial" | "starter" | "growth" | "agency";
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarInitials: string;
  createdAt: string;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: MemberRole;
  jobTitle: string | null;
  createdAt: string;
}

/** Approval thresholds. Drive the queue and the "needs a human" decision. */
export interface ApprovalSettings {
  /** Reviews at or above this rating may be drafted and auto approved. */
  autoApproveMinStars: number;
  /** Any risk flag forces a human, regardless of rating. */
  requireApprovalWhenRiskFlagged: boolean;
  /** Drafts requested from the model per generation run. */
  draftsPerGeneration: number;
  /** Publishing without an approval record is never allowed when true. */
  requireApprovalBeforePublish: boolean;
}

export interface BusinessProfile {
  id: string;
  tenantId: string;
  name: string;
  category: BusinessCategory;
  city: string;
  district: string | null;
  address: string | null;
  description: string;
  tone: ToneKey;
  toneDescriptors: string[];
  emojiPolicy: EmojiPolicy;
  signOff: string;
  /** Free text rules appended to the tenant prompt layer. */
  negativePolicy: string;
  /** Public link to the venue reviews, used for the manual publish hop. */
  googleReviewUrl: string | null;
  escalationEmail: string | null;
  escalationPhone: string | null;
  bannedPhrases: string[];
  preferredWords: string[];
  doNotMention: string[];
  languages: string[];
  primaryLanguage: string;
  approvalSettings: ApprovalSettings;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordBankItem {
  id: string;
  businessProfileId: string;
  phrase: string;
  type: KeywordType;
  active: boolean;
  /** Times the phrase already landed in an approved reply. Prevents repetition. */
  usageCount: number;
  createdAt: string;
}

export interface BrandVoiceExample {
  id: string;
  businessProfileId: string;
  exampleType: BrandVoiceExampleType;
  content: string;
  createdAt: string;
}

export interface ReviewRiskFlag {
  id: string;
  reviewId: string;
  flagType: RiskFlagType;
  severity: RiskSeverity;
  /** Snippet from the review that triggered the flag. Shown in the UI. */
  evidence: string | null;
  createdAt: string;
}

export interface ReviewDraft {
  id: string;
  reviewId: string;
  model: string;
  promptVersion: string;
  draftText: string;
  /** 0 to 100. Heuristic blend of length, specificity and rule compliance. */
  qualityScore: number;
  selected: boolean;
  /** Short internal note on the angle taken. Never shown to the reviewer. */
  rationale: string;
  safetyTags: string[];
  keywordUsed: string | null;
  editedFromDraftId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ReviewApproval {
  id: string;
  reviewId: string;
  draftId: string | null;
  decision: ApprovalDecision;
  approvedBy: string;
  notes: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  tenantId: string;
  businessProfileId: string;
  source: ReviewSource;
  externalId: string | null;
  reviewerName: string | null;
  stars: number;
  reviewText: string;
  language: string;
  sentiment: Sentiment | null;
  /** 0 to 100. Higher means more care needed before publishing. */
  riskScore: number;
  status: ReviewStatus;
  requiresApproval: boolean;
  assignedTo: string | null;
  publishedReply: string | null;
  publishedAt: string | null;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  tenantId: string;
  actorUserId: string | null;
  actorName: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Review joined with everything the operations UI needs in one payload. */
export interface ReviewWithContext extends Review {
  riskFlags: ReviewRiskFlag[];
  drafts: ReviewDraft[];
  approvals: ReviewApproval[];
  selectedDraft: ReviewDraft | null;
}

export interface DashboardMetrics {
  totalReviews: number;
  processedReviews: number;
  pendingApprovals: number;
  responseRate: number;
  averageResponseHours: number | null;
  averageRating: number;
  sentimentSplit: Record<"positive" | "neutral" | "mixed" | "negative", number>;
  starSplit: Record<1 | 2 | 3 | 4 | 5, number>;
  highRiskCount: number;
  awaitingGeneration: number;
}
