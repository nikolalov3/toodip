import type {
  ActivityAction,
  BusinessCategory,
  BrandVoiceExampleType,
  KeywordType,
  MemberRole,
  ReviewSource,
  ReviewStatus,
  RiskFlagType,
  RiskSeverity,
  Sentiment,
  ToneKey,
} from "@/types/domain";

/**
 * Single place where domain enums become English UI copy. Swapping this file
 * for a keyed dictionary is all that a second interface language needs.
 */

export const statusLabels: Record<ReviewStatus, string> = {
  new: "New",
  draft_generated: "Draft ready",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
  archived: "Archived",
};

export const statusDescriptions: Record<ReviewStatus, string> = {
  new: "Ingested, not classified or drafted yet.",
  draft_generated: "Drafts exist. Nobody has picked one.",
  pending_approval: "A draft is selected and waiting for a human decision.",
  approved: "Cleared for publishing.",
  rejected: "Sent back. Needs a different reply.",
  published: "Reply is live on the source platform.",
  archived: "Closed without a public reply.",
};

export const sentimentLabels: Record<Sentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  mixed: "Mixed",
  negative: "Negative",
};

export const riskFlagLabels: Record<RiskFlagType, string> = {
  staff_named: "Staff named",
  complaint: "Complaint",
  refund_issue: "Refund or money",
  legal_threat: "Legal threat",
  health_safety: "Health or safety",
  competitor_mention: "Competitor mentioned",
  offensive_language: "Offensive language",
  likely_fake: "Possibly fake",
  unclear_sentiment: "Unclear sentiment",
};

export const riskFlagGuidance: Record<RiskFlagType, string> = {
  staff_named:
    "Never confirm or discuss an individual employee in public. Keep the reply about the venue.",
  complaint:
    "Acknowledge the specific problem, apologise once, move the conversation to a private channel.",
  refund_issue:
    "Do not promise money back in public. Offer a direct contact and settle it privately.",
  legal_threat:
    "Do not respond without the owner. Keep any reply factual, short and non committal.",
  health_safety:
    "Highest priority. Escalate to the owner today, respond only after the facts are checked.",
  competitor_mention:
    "Never comment on another venue. Answer only for your own business.",
  offensive_language:
    "Consider reporting the review to the platform. If replying, stay neutral and brief.",
  likely_fake:
    "Report to the platform before replying. A short, factual reply protects the profile.",
  unclear_sentiment:
    "Read it again before drafting. Ambiguous reviews are the ones that get replies wrong.",
};

export const riskSeverityLabels: Record<RiskSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const sourceLabels: Record<ReviewSource, string> = {
  google: "Google",
  facebook: "Facebook",
  tripadvisor: "Tripadvisor",
  booking: "Booking.com",
  manual: "Manual entry",
};

export const categoryLabels: Record<BusinessCategory, string> = {
  cafe: "Cafe",
  restaurant: "Restaurant",
  bakery: "Bakery",
  bar: "Bar",
  hotel: "Hotel",
  beauty: "Beauty and wellness",
  clinic: "Clinic",
  trades: "Trades and services",
  other: "Other",
};

export const toneLabels: Record<ToneKey, string> = {
  warm_professional: "Warm and professional",
  concise_professional: "Concise and professional",
  friendly_casual: "Friendly and casual",
  formal: "Formal",
};

export const toneHints: Record<ToneKey, string> = {
  warm_professional:
    "Human and welcoming, but never gushing. The default for hospitality.",
  concise_professional:
    "Short, factual, respectful. Works well for high review volume.",
  friendly_casual:
    "Relaxed and personal. Fits neighbourhood venues with a young crowd.",
  formal: "Reserved and precise. Fits clinics, legal and premium services.",
};

export const keywordTypeLabels: Record<KeywordType, string> = {
  local: "Local",
  service: "Service",
  product: "Product",
  brand: "Brand",
};

export const brandVoiceExampleLabels: Record<BrandVoiceExampleType, string> = {
  positive_reply: "Positive reply",
  neutral_reply: "Neutral reply",
  negative_reply: "Negative reply",
  tone_descriptor: "Tone descriptor",
  phrase_to_prefer: "Phrase to prefer",
  phrase_to_avoid: "Phrase to avoid",
};

export const roleLabels: Record<MemberRole, string> = {
  platform_admin: "Platform admin",
  tenant_admin: "Workspace admin",
  tenant_member: "Member",
};

export const activityLabels: Record<ActivityAction, string> = {
  "review.created": "added a review",
  "review.classified": "classified a review",
  "review.archived": "archived a review",
  "draft.generated": "generated drafts",
  "draft.selected": "selected a draft",
  "draft.edited": "edited a draft",
  "review.approved": "approved a reply",
  "review.rejected": "rejected a reply",
  "review.published": "published a reply",
  "business_profile.updated": "updated the business profile",
  "keyword_bank.updated": "updated the keyword bank",
  "brand_voice.updated": "updated brand voice",
  "member.invited": "invited a teammate",
  "demo.reset": "reset the demo workspace",
};
