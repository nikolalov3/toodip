-- ============================================================================
--  Review Reply Assistant, row level security
--
--  One rule: a row is visible only to members of its tenant. Settings tables
--  are writable by tenant admins and platform admins. The audit log can be
--  appended to but never edited or deleted, by anyone, through the API.
-- ============================================================================

-- ── Helpers ─────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so a policy can read tenant_members without recursing into
-- the policy on tenant_members itself.

create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tenant_members
    where user_id = auth.uid() and role = 'platform_admin'
  );
$$;

create or replace function is_tenant_member(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_platform_admin() or exists (
    select 1 from tenant_members
    where user_id = auth.uid() and tenant_id = target_tenant
  );
$$;

create or replace function is_tenant_admin(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_platform_admin() or exists (
    select 1 from tenant_members
    where user_id = auth.uid()
      and tenant_id = target_tenant
      and role = 'tenant_admin'
  );
$$;

-- Tenant of a business profile, used by the tables that hang off it.
create or replace function tenant_of_business_profile(profile uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from business_profiles where id = profile;
$$;

-- Tenant of a review, used by flags, drafts and approvals.
create or replace function tenant_of_review(review uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from reviews where id = review;
$$;

-- ── profiles ────────────────────────────────────────────────────────────────

alter table profiles enable row level security;

create policy "profiles: read own"
  on profiles for select
  using (user_id = auth.uid());

-- Teammates inside a shared tenant are visible, which the team screen needs.
create policy "profiles: read teammates"
  on profiles for select
  using (
    exists (
      select 1
      from tenant_members me
      join tenant_members them on them.tenant_id = me.tenant_id
      where me.user_id = auth.uid() and them.user_id = profiles.user_id
    )
  );

create policy "profiles: write own"
  on profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "profiles: insert own"
  on profiles for insert
  with check (user_id = auth.uid());

-- ── tenants ─────────────────────────────────────────────────────────────────

alter table tenants enable row level security;

create policy "tenants: read own"
  on tenants for select
  using (is_tenant_member(id));

create policy "tenants: admin update"
  on tenants for update
  using (is_tenant_admin(id))
  with check (is_tenant_admin(id));

-- ── tenant_members ──────────────────────────────────────────────────────────

alter table tenant_members enable row level security;

create policy "members: read same tenant"
  on tenant_members for select
  using (is_tenant_member(tenant_id));

create policy "members: admin manage"
  on tenant_members for all
  using (is_tenant_admin(tenant_id))
  with check (is_tenant_admin(tenant_id));

-- ── business_profiles ───────────────────────────────────────────────────────

alter table business_profiles enable row level security;

create policy "business profiles: read"
  on business_profiles for select
  using (is_tenant_member(tenant_id));

create policy "business profiles: admin write"
  on business_profiles for all
  using (is_tenant_admin(tenant_id))
  with check (is_tenant_admin(tenant_id));

-- ── keyword_banks, keyword_bank_items, brand_voice_examples ─────────────────

alter table keyword_banks enable row level security;

create policy "keyword banks: read"
  on keyword_banks for select
  using (is_tenant_member(tenant_of_business_profile(business_profile_id)));

create policy "keyword banks: admin write"
  on keyword_banks for all
  using (is_tenant_admin(tenant_of_business_profile(business_profile_id)))
  with check (is_tenant_admin(tenant_of_business_profile(business_profile_id)));

alter table keyword_bank_items enable row level security;

create policy "keyword items: read"
  on keyword_bank_items for select
  using (is_tenant_member(tenant_of_business_profile(business_profile_id)));

create policy "keyword items: admin write"
  on keyword_bank_items for all
  using (is_tenant_admin(tenant_of_business_profile(business_profile_id)))
  with check (is_tenant_admin(tenant_of_business_profile(business_profile_id)));

alter table brand_voice_examples enable row level security;

create policy "brand voice: read"
  on brand_voice_examples for select
  using (is_tenant_member(tenant_of_business_profile(business_profile_id)));

create policy "brand voice: admin write"
  on brand_voice_examples for all
  using (is_tenant_admin(tenant_of_business_profile(business_profile_id)))
  with check (is_tenant_admin(tenant_of_business_profile(business_profile_id)));

-- ── review_sources ──────────────────────────────────────────────────────────

alter table review_sources enable row level security;

create policy "review sources: read"
  on review_sources for select
  using (is_tenant_member(tenant_id));

create policy "review sources: admin write"
  on review_sources for all
  using (is_tenant_admin(tenant_id))
  with check (is_tenant_admin(tenant_id));

-- ── reviews ─────────────────────────────────────────────────────────────────

alter table reviews enable row level security;

create policy "reviews: read"
  on reviews for select
  using (is_tenant_member(tenant_id));

-- Any member may ingest and work a review. Approval is enforced by the service
-- layer and by the approvals policy below, not by hiding rows.
create policy "reviews: member insert"
  on reviews for insert
  with check (is_tenant_member(tenant_id));

create policy "reviews: member update"
  on reviews for update
  using (is_tenant_member(tenant_id))
  with check (is_tenant_member(tenant_id));

create policy "reviews: admin delete"
  on reviews for delete
  using (is_tenant_admin(tenant_id));

-- ── review_risk_flags, review_drafts ────────────────────────────────────────

alter table review_risk_flags enable row level security;

create policy "risk flags: read"
  on review_risk_flags for select
  using (is_tenant_member(tenant_of_review(review_id)));

create policy "risk flags: member write"
  on review_risk_flags for all
  using (is_tenant_member(tenant_of_review(review_id)))
  with check (is_tenant_member(tenant_of_review(review_id)));

alter table review_drafts enable row level security;

create policy "drafts: read"
  on review_drafts for select
  using (is_tenant_member(tenant_of_review(review_id)));

create policy "drafts: member write"
  on review_drafts for all
  using (is_tenant_member(tenant_of_review(review_id)))
  with check (is_tenant_member(tenant_of_review(review_id)));

-- ── review_approvals ────────────────────────────────────────────────────────
-- Only an admin may record a decision, and only in their own name.

alter table review_approvals enable row level security;

create policy "approvals: read"
  on review_approvals for select
  using (is_tenant_member(tenant_of_review(review_id)));

create policy "approvals: admin insert"
  on review_approvals for insert
  with check (
    is_tenant_admin(tenant_of_review(review_id))
    and approved_by = auth.uid()
  );

-- No update and no delete policy. A decision that has been recorded stands.

-- ── activity_logs ───────────────────────────────────────────────────────────
-- Append only. This is the record an agency shows a client.

alter table activity_logs enable row level security;

create policy "activity: read"
  on activity_logs for select
  using (is_tenant_member(tenant_id));

create policy "activity: member insert"
  on activity_logs for insert
  with check (is_tenant_member(tenant_id));
