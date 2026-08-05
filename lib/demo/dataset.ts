import type {
  ActivityLog,
  BrandVoiceExample,
  BusinessProfile,
  KeywordBankItem,
  Profile,
  Review,
  ReviewApproval,
  ReviewDraft,
  ReviewRiskFlag,
  Tenant,
  TenantMember,
} from "@/types/domain";

/**
 * Bump when the seed shape changes. A persisted workspace from an older shape
 * is discarded and reseeded instead of half filling new fields.
 */
export const SEED_VERSION = 2;

/** Everything one demo session owns. Mirrors the Supabase table set. */
export interface DemoDataset {
  version: number;
  tenants: Tenant[];
  profiles: Profile[];
  members: TenantMember[];
  businessProfiles: BusinessProfile[];
  keywordItems: KeywordBankItem[];
  brandVoiceExamples: BrandVoiceExample[];
  reviews: Review[];
  riskFlags: ReviewRiskFlag[];
  drafts: ReviewDraft[];
  approvals: ReviewApproval[];
  activity: ActivityLog[];
}
