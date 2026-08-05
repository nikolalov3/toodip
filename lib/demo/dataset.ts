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

/** Everything one demo session owns. Mirrors the Supabase table set. */
export interface DemoDataset {
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
