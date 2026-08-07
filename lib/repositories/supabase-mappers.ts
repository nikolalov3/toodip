import type {
  ActivityLog,
  ApprovalSettings,
  BrandVoiceExample,
  BusinessProfile,
  KeywordBankItem,
  Review,
  ReviewApproval,
  ReviewDraft,
  ReviewRiskFlag,
  Tenant,
} from "@/types/domain";

/**
 * Row shapes and converters between the database and the domain model.
 *
 * The database is snake_case because that is what Postgres and PostgREST are
 * comfortable with. The domain model is camelCase because that is what the rest
 * of the codebase reads. This file is the only place the two meet.
 */

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: Tenant["plan"];
  created_at: string;
}

export interface BusinessProfileRow {
  id: string;
  tenant_id: string;
  name: string;
  category: BusinessProfile["category"];
  city: string;
  district: string | null;
  address: string | null;
  description: string;
  tone: BusinessProfile["tone"];
  tone_descriptors: string[];
  emoji_policy: BusinessProfile["emojiPolicy"];
  sign_off: string;
  negative_policy: string;
  google_review_url: string | null;
  escalation_email: string | null;
  escalation_phone: string | null;
  banned_phrases: string[];
  preferred_words: string[];
  do_not_mention: string[];
  languages: string[];
  primary_language: string;
  approval_settings: ApprovalSettings;
  created_at: string;
  updated_at: string;
}

export interface KeywordItemRow {
  id: string;
  business_profile_id: string;
  phrase: string;
  type: KeywordBankItem["type"];
  active: boolean;
  usage_count: number;
  created_at: string;
}

export interface BrandVoiceRow {
  id: string;
  business_profile_id: string;
  example_type: BrandVoiceExample["exampleType"];
  content: string;
  created_at: string;
}

export interface RiskFlagRow {
  id: string;
  review_id: string;
  flag_type: ReviewRiskFlag["flagType"];
  severity: ReviewRiskFlag["severity"];
  evidence: string | null;
  created_at: string;
}

export interface DraftRow {
  id: string;
  review_id: string;
  model: string;
  prompt_version: string;
  draft_text: string;
  quality_score: number;
  selected: boolean;
  rationale: string;
  safety_tags: string[];
  keyword_used: string | null;
  edited_from_draft_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ApprovalRow {
  id: string;
  review_id: string;
  draft_id: string | null;
  decision: ReviewApproval["decision"];
  approved_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  tenant_id: string;
  business_profile_id: string;
  source: Review["source"];
  external_id: string | null;
  reviewer_name: string | null;
  stars: number;
  review_text: string;
  language: string;
  sentiment: Review["sentiment"];
  risk_score: number;
  status: Review["status"];
  requires_approval: boolean;
  assigned_to: string | null;
  published_reply: string | null;
  published_at: string | null;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
  review_risk_flags?: RiskFlagRow[];
  review_drafts?: DraftRow[];
  review_approvals?: ApprovalRow[];
}

export interface ActivityRow {
  id: string;
  tenant_id: string;
  actor_user_id: string | null;
  actor_name: string;
  entity_type: ActivityLog["entityType"];
  entity_id: string;
  action: ActivityLog["action"];
  metadata: Record<string, unknown>;
  created_at: string;
}

export const REVIEW_SELECT =
  "*, review_risk_flags(*), review_drafts(*), review_approvals(*)";

export function toTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    createdAt: row.created_at,
  };
}

export function toBusinessProfile(row: BusinessProfileRow): BusinessProfile {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    category: row.category,
    city: row.city,
    district: row.district,
    address: row.address,
    description: row.description,
    tone: row.tone,
    toneDescriptors: row.tone_descriptors ?? [],
    emojiPolicy: row.emoji_policy,
    signOff: row.sign_off,
    negativePolicy: row.negative_policy,
    googleReviewUrl: row.google_review_url,
    escalationEmail: row.escalation_email,
    escalationPhone: row.escalation_phone,
    bannedPhrases: row.banned_phrases ?? [],
    preferredWords: row.preferred_words ?? [],
    doNotMention: row.do_not_mention ?? [],
    languages: row.languages ?? [],
    primaryLanguage: row.primary_language,
    approvalSettings: row.approval_settings,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Only the columns the app is allowed to change, in database naming. */
export function fromBusinessProfile(
  patch: Partial<Omit<BusinessProfile, "id" | "tenantId" | "createdAt">>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) row[key] = value;
  };

  set("name", patch.name);
  set("category", patch.category);
  set("city", patch.city);
  set("district", patch.district);
  set("address", patch.address);
  set("description", patch.description);
  set("tone", patch.tone);
  set("tone_descriptors", patch.toneDescriptors);
  set("emoji_policy", patch.emojiPolicy);
  set("sign_off", patch.signOff);
  set("negative_policy", patch.negativePolicy);
  set("google_review_url", patch.googleReviewUrl);
  set("escalation_email", patch.escalationEmail);
  set("escalation_phone", patch.escalationPhone);
  set("banned_phrases", patch.bannedPhrases);
  set("preferred_words", patch.preferredWords);
  set("do_not_mention", patch.doNotMention);
  set("languages", patch.languages);
  set("primary_language", patch.primaryLanguage);
  set("approval_settings", patch.approvalSettings);
  return row;
}

export function toKeywordItem(row: KeywordItemRow): KeywordBankItem {
  return {
    id: row.id,
    businessProfileId: row.business_profile_id,
    phrase: row.phrase,
    type: row.type,
    active: row.active,
    usageCount: row.usage_count,
    createdAt: row.created_at,
  };
}

export function toBrandVoiceExample(row: BrandVoiceRow): BrandVoiceExample {
  return {
    id: row.id,
    businessProfileId: row.business_profile_id,
    exampleType: row.example_type,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function toRiskFlag(row: RiskFlagRow): ReviewRiskFlag {
  return {
    id: row.id,
    reviewId: row.review_id,
    flagType: row.flag_type,
    severity: row.severity,
    evidence: row.evidence,
    createdAt: row.created_at,
  };
}

export function toDraft(row: DraftRow): ReviewDraft {
  return {
    id: row.id,
    reviewId: row.review_id,
    model: row.model,
    promptVersion: row.prompt_version,
    draftText: row.draft_text,
    qualityScore: row.quality_score,
    selected: row.selected,
    rationale: row.rationale,
    safetyTags: row.safety_tags ?? [],
    keywordUsed: row.keyword_used,
    editedFromDraftId: row.edited_from_draft_id,
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
  };
}

export function toApproval(row: ApprovalRow): ReviewApproval {
  return {
    id: row.id,
    reviewId: row.review_id,
    draftId: row.draft_id,
    decision: row.decision,
    approvedBy: row.approved_by ?? "",
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    businessProfileId: row.business_profile_id,
    source: row.source,
    externalId: row.external_id,
    reviewerName: row.reviewer_name,
    stars: row.stars,
    reviewText: row.review_text,
    language: row.language,
    sentiment: row.sentiment,
    riskScore: row.risk_score,
    status: row.status,
    requiresApproval: row.requires_approval,
    assignedTo: row.assigned_to,
    publishedReply: row.published_reply,
    publishedAt: row.published_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromReview(patch: Partial<Review>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) row[key] = value;
  };

  set("source", patch.source);
  set("reviewer_name", patch.reviewerName);
  set("stars", patch.stars);
  set("review_text", patch.reviewText);
  set("language", patch.language);
  set("sentiment", patch.sentiment);
  set("risk_score", patch.riskScore);
  set("status", patch.status);
  set("requires_approval", patch.requiresApproval);
  set("assigned_to", patch.assignedTo);
  set("published_reply", patch.publishedReply);
  set("published_at", patch.publishedAt);
  set("reviewed_at", patch.reviewedAt);
  return row;
}

export function toActivity(row: ActivityRow): ActivityLog {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}
