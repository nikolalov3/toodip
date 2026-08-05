import "server-only";

import {
  matchesFilters,
  newestFirst,
  sortReviews,
} from "@/lib/repositories/review-query";
import {
  REVIEW_SELECT,
  fromBusinessProfile,
  fromReview,
  toActivity,
  toApproval,
  toBrandVoiceExample,
  toBusinessProfile,
  toDraft,
  toKeywordItem,
  toReview,
  toRiskFlag,
  toTenant,
  type ActivityRow,
  type ApprovalRow,
  type BrandVoiceRow,
  type BusinessProfileRow,
  type DraftRow,
  type KeywordItemRow,
  type ReviewRow,
  type TenantRow,
} from "@/lib/repositories/supabase-mappers";
import { assertOk, getServiceClient } from "@/lib/supabase/server";
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

/**
 * Supabase persistence adapter.
 *
 * Runs on the service role key, so row level security is bypassed and tenant
 * scoping is enforced here, in every query, by tenant_id. That is a deliberate
 * first step: it lets the data layer be swapped and verified on its own, before
 * authentication changes underneath it. Once Supabase Auth is in, requests move
 * to a per user client and the policies in 0002_rls.sql take over the isolation
 * they were written for.
 *
 * The acting user is resolved by email rather than by a fixed id, so it does not
 * matter whether the demo accounts were created by seed.sql or by hand in the
 * dashboard.
 */

interface ActorContext {
  /** Email of the person acting. Resolved to a database user id on demand. */
  email: string;
}

export function createSupabaseRepository(actor: ActorContext): DataRepository {
  const client = getServiceClient();

  let actorUserId: string | null = null;
  let tenantId: string | null = null;
  let businessProfileId: string | null = null;

  async function requireActorUserId(): Promise<string> {
    if (actorUserId) return actorUserId;
    const result = await client
      .from("profiles")
      .select("user_id")
      .eq("email", actor.email)
      .maybeSingle();
    if (result.error) {
      throw new Error(`Resolving the acting user: ${result.error.message}`);
    }
    if (!result.data) {
      throw new Error(
        `No profile for ${actor.email}. Run supabase/seed.sql, or create the account and add a profiles row.`,
      );
    }
    actorUserId = (result.data as { user_id: string }).user_id;
    return actorUserId;
  }

  async function requireTenantId(): Promise<string> {
    if (tenantId) return tenantId;
    const userId = await requireActorUserId();
    const result = await client
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (result.error) {
      throw new Error(`Resolving the workspace: ${result.error.message}`);
    }
    if (!result.data) {
      throw new Error(`${actor.email} is not a member of any workspace.`);
    }
    tenantId = (result.data as { tenant_id: string }).tenant_id;
    return tenantId;
  }

  async function requireBusinessProfileId(): Promise<string> {
    if (businessProfileId) return businessProfileId;
    businessProfileId = (await getBusinessProfileRow()).id;
    return businessProfileId;
  }

  async function getBusinessProfileRow(): Promise<BusinessProfileRow> {
    const tenant = await requireTenantId();
    const result = await client
      .from("business_profiles")
      .select("*")
      .eq("tenant_id", tenant)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (result.error) {
      throw new Error(`Loading the business profile: ${result.error.message}`);
    }
    if (!result.data) {
      throw new Error(
        "This workspace has no business profile. Run supabase/seed.sql or complete the setup wizard.",
      );
    }
    return result.data as BusinessProfileRow;
  }

  function hydrate(row: ReviewRow): ReviewWithContext {
    const drafts = newestFirst((row.review_drafts ?? []).map(toDraft));
    return {
      ...toReview(row),
      riskFlags: (row.review_risk_flags ?? []).map(toRiskFlag),
      drafts,
      approvals: newestFirst((row.review_approvals ?? []).map(toApproval)),
      selectedDraft: drafts.find((draft) => draft.selected) ?? null,
    };
  }

  async function fetchReview(reviewId: string): Promise<ReviewWithContext> {
    const tenant = await requireTenantId();
    const result = await client
      .from("reviews")
      .select(REVIEW_SELECT)
      .eq("tenant_id", tenant)
      .eq("id", reviewId)
      .maybeSingle();
    if (result.error) {
      throw new Error(`Loading review ${reviewId}: ${result.error.message}`);
    }
    if (!result.data) throw new Error(`Review ${reviewId} not found`);
    return hydrate(result.data as unknown as ReviewRow);
  }

  return {
    async getTenant(): Promise<Tenant> {
      const tenant = await requireTenantId();
      const result = await client
        .from("tenants")
        .select("*")
        .eq("id", tenant)
        .single();
      return toTenant(assertOk(result, "Loading the workspace") as TenantRow);
    },

    async listMembers(): Promise<MemberWithProfile[]> {
      const tenant = await requireTenantId();

      const membersResult = await client
        .from("tenant_members")
        .select("user_id, role, job_title, created_at")
        .eq("tenant_id", tenant)
        .order("created_at", { ascending: true });
      const members = assertOk(membersResult, "Loading members") as Array<{
        user_id: string;
        role: MemberWithProfile["role"];
        job_title: string | null;
        created_at: string;
      }>;

      if (members.length === 0) return [];

      const profilesResult = await client
        .from("profiles")
        .select("user_id, full_name, email, avatar_initials")
        .in(
          "user_id",
          members.map((member) => member.user_id),
        );
      const profiles = assertOk(profilesResult, "Loading profiles") as Array<{
        user_id: string;
        full_name: string;
        email: string;
        avatar_initials: string;
      }>;
      const byUser = new Map(profiles.map((row) => [row.user_id, row]));

      return members.map((member) => {
        const profile = byUser.get(member.user_id);
        return {
          userId: member.user_id,
          fullName: profile?.full_name ?? "Unknown user",
          email: profile?.email ?? "",
          initials: profile?.avatar_initials ?? "??",
          role: member.role,
          jobTitle: member.job_title,
          joinedAt: member.created_at,
        };
      });
    },

    async getBusinessProfile(): Promise<BusinessProfile> {
      return toBusinessProfile(await getBusinessProfileRow());
    },

    async updateBusinessProfile(patch): Promise<BusinessProfile> {
      const id = await requireBusinessProfileId();
      const result = await client
        .from("business_profiles")
        .update(fromBusinessProfile(patch))
        .eq("id", id)
        .select("*")
        .single();
      return toBusinessProfile(
        assertOk(result, "Saving the business profile") as BusinessProfileRow,
      );
    },

    async listKeywordItems(): Promise<KeywordBankItem[]> {
      const profileId = await requireBusinessProfileId();
      const result = await client
        .from("keyword_bank_items")
        .select("*")
        .eq("business_profile_id", profileId)
        .order("created_at", { ascending: true });
      return (
        assertOk(result, "Loading the keyword bank") as KeywordItemRow[]
      ).map(toKeywordItem);
    },

    async replaceKeywordItems(items): Promise<KeywordBankItem[]> {
      const profileId = await requireBusinessProfileId();

      // Usage counts are earned, not submitted, so they survive a rewrite.
      const existingResult = await client
        .from("keyword_bank_items")
        .select("phrase, usage_count")
        .eq("business_profile_id", profileId);
      const existing = assertOk(
        existingResult,
        "Loading keyword usage",
      ) as Array<{ phrase: string; usage_count: number }>;
      const usage = new Map(
        existing.map((row) => [row.phrase, row.usage_count]),
      );

      const deleteResult = await client
        .from("keyword_bank_items")
        .delete()
        .eq("business_profile_id", profileId);
      if (deleteResult.error) {
        throw new Error(
          `Clearing the keyword bank: ${deleteResult.error.message}`,
        );
      }

      if (items.length === 0) return [];

      const insertResult = await client
        .from("keyword_bank_items")
        .insert(
          items.map((item) => ({
            business_profile_id: profileId,
            phrase: item.phrase,
            type: item.type,
            active: item.active,
            usage_count: usage.get(item.phrase) ?? 0,
          })),
        )
        .select("*");
      return (
        assertOk(insertResult, "Saving the keyword bank") as KeywordItemRow[]
      ).map(toKeywordItem);
    },

    async incrementKeywordUsage(phrase: string): Promise<void> {
      const profileId = await requireBusinessProfileId();
      const current = await client
        .from("keyword_bank_items")
        .select("id, usage_count")
        .eq("business_profile_id", profileId)
        .eq("phrase", phrase)
        .maybeSingle();
      if (current.error || !current.data) return;

      const row = current.data as { id: string; usage_count: number };
      await client
        .from("keyword_bank_items")
        .update({ usage_count: row.usage_count + 1 })
        .eq("id", row.id);
    },

    async listBrandVoiceExamples(): Promise<BrandVoiceExample[]> {
      const profileId = await requireBusinessProfileId();
      const result = await client
        .from("brand_voice_examples")
        .select("*")
        .eq("business_profile_id", profileId)
        .order("created_at", { ascending: true });
      return (
        assertOk(result, "Loading brand voice") as BrandVoiceRow[]
      ).map(toBrandVoiceExample);
    },

    async replaceBrandVoiceExamples(items): Promise<BrandVoiceExample[]> {
      const profileId = await requireBusinessProfileId();

      const deleteResult = await client
        .from("brand_voice_examples")
        .delete()
        .eq("business_profile_id", profileId);
      if (deleteResult.error) {
        throw new Error(`Clearing brand voice: ${deleteResult.error.message}`);
      }

      if (items.length === 0) return [];

      const insertResult = await client
        .from("brand_voice_examples")
        .insert(
          items.map((item) => ({
            business_profile_id: profileId,
            example_type: item.exampleType,
            content: item.content,
          })),
        )
        .select("*");
      return (
        assertOk(insertResult, "Saving brand voice") as BrandVoiceRow[]
      ).map(toBrandVoiceExample);
    },

    async listReviews(filters: ReviewFilters = {}): Promise<
      ReviewWithContext[]
    > {
      const tenant = await requireTenantId();

      let query = client
        .from("reviews")
        .select(REVIEW_SELECT)
        .eq("tenant_id", tenant);

      // Cheap filters go to the database. Anything derived from joined rows is
      // applied afterwards by the shared rules.
      if (filters.stars?.length) query = query.in("stars", filters.stars);
      if (filters.statuses?.length) {
        query = query.in("status", filters.statuses);
      }
      if (filters.sentiments?.length) {
        query = query.in("sentiment", filters.sentiments);
      }
      if (filters.sources?.length) query = query.in("source", filters.sources);
      if (filters.approval === "required") {
        query = query.eq("requires_approval", true);
      }
      if (filters.approval === "not_required") {
        query = query.eq("requires_approval", false);
      }
      if (filters.assignedTo) {
        query = query.eq("assigned_to", filters.assignedTo);
      }
      if (filters.search?.trim()) {
        const needle = filters.search.trim().replace(/[%,()]/g, " ");
        query = query.or(
          `review_text.ilike.%${needle}%,reviewer_name.ilike.%${needle}%`,
        );
      }

      const result = await query;
      const rows = assertOk(result, "Loading reviews") as unknown as ReviewRow[];
      const hydrated = rows.map(hydrate);

      return sortReviews(
        hydrated.filter((review) => matchesFilters(review, filters)),
        filters.sort,
      );
    },

    async getReview(reviewId: string): Promise<ReviewWithContext | null> {
      try {
        return await fetchReview(reviewId);
      } catch (error) {
        if ((error as Error).message.includes("not found")) return null;
        throw error;
      }
    },

    async createReview(input: NewReviewInput): Promise<Review> {
      const tenant = await requireTenantId();
      const profileId = await requireBusinessProfileId();

      const result = await client
        .from("reviews")
        .insert({
          tenant_id: tenant,
          business_profile_id: profileId,
          source: input.source,
          external_id: input.externalId ?? null,
          reviewer_name: input.reviewerName,
          stars: input.stars,
          review_text: input.reviewText,
          language: input.language,
          status: "new",
          requires_approval: true,
          reviewed_at: input.reviewedAt ?? new Date().toISOString(),
        })
        .select("*")
        .single();
      return toReview(assertOk(result, "Adding the review") as ReviewRow);
    },

    async updateReview(reviewId, patch): Promise<Review> {
      const tenant = await requireTenantId();
      const result = await client
        .from("reviews")
        .update(fromReview(patch))
        .eq("tenant_id", tenant)
        .eq("id", reviewId)
        .select("*")
        .single();
      return toReview(assertOk(result, "Updating the review") as ReviewRow);
    },

    async replaceRiskFlags(reviewId, flags): Promise<ReviewRiskFlag[]> {
      await fetchReview(reviewId);

      const deleteResult = await client
        .from("review_risk_flags")
        .delete()
        .eq("review_id", reviewId);
      if (deleteResult.error) {
        throw new Error(`Clearing risk flags: ${deleteResult.error.message}`);
      }

      if (flags.length === 0) return [];

      const insertResult = await client
        .from("review_risk_flags")
        .insert(
          flags.map((flag) => ({
            review_id: reviewId,
            flag_type: flag.flagType,
            severity: flag.severity,
            evidence: flag.evidence,
          })),
        )
        .select("*");
      return (
        assertOk(insertResult, "Saving risk flags") as Array<
          Parameters<typeof toRiskFlag>[0]
        >
      ).map(toRiskFlag);
    },

    async addDrafts(
      reviewId: string,
      drafts: NewDraftInput[],
    ): Promise<ReviewDraft[]> {
      await fetchReview(reviewId);
      if (drafts.length === 0) return [];

      const result = await client
        .from("review_drafts")
        .insert(
          drafts.map((draft) => ({
            review_id: reviewId,
            model: draft.model,
            prompt_version: draft.promptVersion,
            draft_text: draft.draftText,
            quality_score: draft.qualityScore,
            selected: draft.selected,
            rationale: draft.rationale,
            safety_tags: draft.safetyTags,
            keyword_used: draft.keywordUsed,
            edited_from_draft_id: draft.editedFromDraftId,
            created_by: draft.createdBy || null,
          })),
        )
        .select("*");
      return (assertOk(result, "Saving drafts") as DraftRow[]).map(toDraft);
    },

    async updateDraft(draftId, patch): Promise<ReviewDraft> {
      const row: Record<string, unknown> = {};
      if (patch.draftText !== undefined) row.draft_text = patch.draftText;
      if (patch.qualityScore !== undefined) {
        row.quality_score = patch.qualityScore;
      }
      if (patch.selected !== undefined) row.selected = patch.selected;
      if (patch.safetyTags !== undefined) row.safety_tags = patch.safetyTags;
      if (patch.rationale !== undefined) row.rationale = patch.rationale;

      const result = await client
        .from("review_drafts")
        .update(row)
        .eq("id", draftId)
        .select("*")
        .single();
      return toDraft(assertOk(result, "Updating the draft") as DraftRow);
    },

    async selectDraft(reviewId, draftId): Promise<ReviewDraft> {
      // A unique partial index allows one selected draft per review, so the
      // old one has to be cleared before the new one is set.
      const clearResult = await client
        .from("review_drafts")
        .update({ selected: false })
        .eq("review_id", reviewId)
        .eq("selected", true);
      if (clearResult.error) {
        throw new Error(
          `Clearing the previous selection: ${clearResult.error.message}`,
        );
      }

      const result = await client
        .from("review_drafts")
        .update({ selected: true })
        .eq("id", draftId)
        .eq("review_id", reviewId)
        .select("*")
        .single();
      return toDraft(assertOk(result, "Selecting the draft") as DraftRow);
    },

    async addApproval(input): Promise<ReviewApproval> {
      const approvedBy = input.approvedBy || (await requireActorUserId());
      const result = await client
        .from("review_approvals")
        .insert({
          review_id: input.reviewId,
          draft_id: input.draftId,
          decision: input.decision,
          approved_by: approvedBy,
          notes: input.notes,
        })
        .select("*")
        .single();
      return toApproval(
        assertOk(result, "Recording the decision") as ApprovalRow,
      );
    },

    async listActivity(options = {}): Promise<ActivityLog[]> {
      const tenant = await requireTenantId();
      let query = client
        .from("activity_logs")
        .select("*")
        .eq("tenant_id", tenant)
        .order("created_at", { ascending: false })
        .limit(options.limit ?? 50);
      if (options.entityId) query = query.eq("entity_id", options.entityId);

      const result = await query;
      return (assertOk(result, "Loading activity") as ActivityRow[]).map(
        toActivity,
      );
    },

    async logActivity(input): Promise<ActivityLog> {
      const tenant = await requireTenantId();
      const result = await client
        .from("activity_logs")
        .insert({
          tenant_id: tenant,
          actor_user_id: input.actorUserId
            ? await requireActorUserId()
            : null,
          actor_name: input.actorName,
          entity_type: input.entityType,
          entity_id: input.entityId,
          action: input.action,
          metadata: input.metadata,
        })
        .select("*")
        .single();
      return toActivity(assertOk(result, "Writing to the log") as ActivityRow);
    },

    async reset(): Promise<void> {
      throw new Error(
        "Reset only exists for the demo workspace. To restore this database, re-run supabase/seed.sql.",
      );
    },
  };
}
