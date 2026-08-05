-- ============================================================================
--  Review Reply Assistant, schema
--  Mirrors types/domain.ts one to one. Run before 0002_rls.sql.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────

create type member_role as enum ('platform_admin', 'tenant_admin', 'tenant_member');

create type business_category as enum (
  'cafe', 'restaurant', 'bakery', 'bar', 'hotel', 'beauty', 'clinic', 'trades', 'other'
);

create type review_source as enum (
  'google', 'facebook', 'tripadvisor', 'booking', 'manual'
);

create type review_status as enum (
  'new', 'draft_generated', 'pending_approval', 'approved', 'rejected', 'published', 'archived'
);

create type sentiment as enum ('positive', 'neutral', 'mixed', 'negative');

create type risk_flag_type as enum (
  'staff_named', 'complaint', 'refund_issue', 'legal_threat', 'health_safety',
  'competitor_mention', 'offensive_language', 'likely_fake', 'unclear_sentiment'
);

create type risk_severity as enum ('low', 'medium', 'high');

create type tone_key as enum (
  'warm_professional', 'concise_professional', 'friendly_casual', 'formal'
);

create type keyword_type as enum ('local', 'service', 'product', 'brand');

create type emoji_policy as enum ('never', 'sparing', 'match_reviewer');

create type brand_voice_example_type as enum (
  'positive_reply', 'neutral_reply', 'negative_reply',
  'tone_descriptor', 'phrase_to_prefer', 'phrase_to_avoid'
);

create type approval_decision as enum ('approved', 'rejected');

create type tenant_plan as enum ('trial', 'starter', 'growth', 'agency');

-- ── Shared helpers ──────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Identity and tenancy ────────────────────────────────────────────────────

create table profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  avatar_initials text not null default '??',
  created_at  timestamptz not null default now()
);

create table tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  plan        tenant_plan not null default 'trial',
  created_at  timestamptz not null default now()
);

create table tenant_members (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        member_role not null default 'tenant_member',
  job_title   text,
  created_at  timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index tenant_members_user_idx on tenant_members (user_id);
create index tenant_members_tenant_idx on tenant_members (tenant_id);

-- ── Business configuration ──────────────────────────────────────────────────

create table business_profiles (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  name              text not null,
  category          business_category not null default 'other',
  city              text not null,
  district          text,
  address           text,
  description       text not null default '',
  tone              tone_key not null default 'warm_professional',
  tone_descriptors  text[] not null default '{}',
  emoji_policy      emoji_policy not null default 'match_reviewer',
  sign_off          text not null default '',
  negative_policy   text not null default '',
  escalation_email  text,
  escalation_phone  text,
  banned_phrases    text[] not null default '{}',
  preferred_words   text[] not null default '{}',
  do_not_mention    text[] not null default '{}',
  languages         text[] not null default '{pl}',
  primary_language  text not null default 'pl',
  -- Approval thresholds. Read by the services layer on every classification.
  approval_settings jsonb not null default jsonb_build_object(
    'autoApproveMinStars', 5,
    'requireApprovalWhenRiskFlagged', true,
    'draftsPerGeneration', 2,
    'requireApprovalBeforePublish', true
  ),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index business_profiles_tenant_idx on business_profiles (tenant_id);

create trigger business_profiles_updated_at
  before update on business_profiles
  for each row execute function set_updated_at();

-- Named banks are not used by the app yet. The column on keyword_bank_items is
-- nullable so a venue can be split into several banks later without a rewrite.
create table keyword_banks (
  id                  uuid primary key default gen_random_uuid(),
  business_profile_id uuid not null references business_profiles(id) on delete cascade,
  name                text not null default 'Default',
  is_default          boolean not null default true,
  created_at          timestamptz not null default now()
);

create index keyword_banks_profile_idx on keyword_banks (business_profile_id);

create table keyword_bank_items (
  id                  uuid primary key default gen_random_uuid(),
  business_profile_id uuid not null references business_profiles(id) on delete cascade,
  bank_id             uuid references keyword_banks(id) on delete set null,
  phrase              text not null,
  type                keyword_type not null default 'local',
  active              boolean not null default true,
  -- Incremented when a reply carrying the phrase is published. The generator
  -- prefers the least used phrase, which is what stops repetition.
  usage_count         integer not null default 0,
  created_at          timestamptz not null default now(),
  unique (business_profile_id, phrase)
);

create index keyword_bank_items_profile_active_idx
  on keyword_bank_items (business_profile_id, active);

create table brand_voice_examples (
  id                  uuid primary key default gen_random_uuid(),
  business_profile_id uuid not null references business_profiles(id) on delete cascade,
  example_type        brand_voice_example_type not null,
  content             text not null,
  created_at          timestamptz not null default now()
);

create index brand_voice_examples_profile_idx
  on brand_voice_examples (business_profile_id, example_type);

-- Connected platforms. Manual entry needs no row here, automatic ingestion does.
create table review_sources (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  business_profile_id uuid not null references business_profiles(id) on delete cascade,
  source              review_source not null,
  external_account_id text,
  display_name        text,
  connected           boolean not null default false,
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  unique (business_profile_id, source)
);

create index review_sources_tenant_idx on review_sources (tenant_id);

-- ── Reviews and replies ─────────────────────────────────────────────────────

create table reviews (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  business_profile_id uuid not null references business_profiles(id) on delete cascade,
  source              review_source not null default 'manual',
  source_id           uuid references review_sources(id) on delete set null,
  external_id         text,
  reviewer_name       text,
  stars               smallint not null check (stars between 1 and 5),
  review_text         text not null,
  language            text not null default 'pl',
  sentiment           sentiment,
  risk_score          smallint not null default 0 check (risk_score between 0 and 100),
  status              review_status not null default 'new',
  requires_approval   boolean not null default true,
  assigned_to         uuid references auth.users(id) on delete set null,
  published_reply     text,
  published_at        timestamptz,
  reviewed_at         timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (business_profile_id, source, external_id)
);

create index reviews_tenant_reviewed_idx on reviews (tenant_id, reviewed_at desc);
create index reviews_tenant_status_idx on reviews (tenant_id, status);
create index reviews_queue_idx on reviews (tenant_id, requires_approval, risk_score desc);
create index reviews_profile_idx on reviews (business_profile_id);
create index reviews_assigned_idx on reviews (assigned_to) where assigned_to is not null;

create trigger reviews_updated_at
  before update on reviews
  for each row execute function set_updated_at();

create table review_risk_flags (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references reviews(id) on delete cascade,
  flag_type   risk_flag_type not null,
  severity    risk_severity not null default 'medium',
  evidence    text,
  created_at  timestamptz not null default now(),
  unique (review_id, flag_type)
);

create index review_risk_flags_review_idx on review_risk_flags (review_id);

create table review_drafts (
  id                  uuid primary key default gen_random_uuid(),
  review_id           uuid not null references reviews(id) on delete cascade,
  model               text not null,
  prompt_version      text not null,
  draft_text          text not null,
  quality_score       smallint not null default 0 check (quality_score between 0 and 100),
  selected            boolean not null default false,
  rationale           text not null default '',
  safety_tags         text[] not null default '{}',
  keyword_used        text,
  edited_from_draft_id uuid references review_drafts(id) on delete set null,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index review_drafts_review_idx on review_drafts (review_id, created_at desc);
-- At most one selected draft per review.
create unique index review_drafts_one_selected_idx
  on review_drafts (review_id) where selected;

create table review_approvals (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references reviews(id) on delete cascade,
  draft_id    uuid references review_drafts(id) on delete set null,
  decision    approval_decision not null,
  approved_by uuid references auth.users(id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index review_approvals_review_idx on review_approvals (review_id, created_at desc);

-- ── Audit ───────────────────────────────────────────────────────────────────

create table activity_logs (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  actor_user_id  uuid references auth.users(id) on delete set null,
  actor_name     text not null default 'System',
  entity_type    text not null,
  entity_id      text not null,
  action         text not null,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index activity_logs_tenant_created_idx on activity_logs (tenant_id, created_at desc);
create index activity_logs_entity_idx on activity_logs (entity_id, created_at desc);
