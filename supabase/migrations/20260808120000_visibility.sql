-- ============================================================================
--  Visibility measurement and the interventions ledger.
--
--  Design decisions, straight from the Profound recon (docs/profound-recon.md):
--  - Branded and category intents are never mixed in one number, so the flag
--    lives on the intent, not in the query.
--  - A run is one prompt sent once to one platform. Distributions come from
--    many runs, never from re-interpreting a single response.
--  - Mentions and citations are separate ledgers. A venue can be mentioned
--    without its site being cited, and that difference is the diagnosis.
--  - Interventions are append only. The link "we changed X, then Y moved" is
--    the one dataset nobody can copy from an API.
-- ============================================================================

create type ai_platform as enum ('chatgpt', 'google_aio', 'perplexity', 'other');

create type measurement_source as enum ('profound', 'toodip', 'manual');

create type intervention_kind as enum (
  'record_update',   -- Google Business Profile attributes, hours, photos
  'review_reply',    -- a reply published on the venue's profile
  'site_change',     -- content or schema on the venue's own site
  'guide_entry',     -- an entry in an external guide or list
  'social_post',     -- Instagram or Facebook activity
  'other'
);

-- ── Intents: the questions a venue should be winning ────────────────────────

create table intents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  language    text not null default 'pl',
  -- Branded intents (asking about the venue by name) always score near 100%
  -- and must never inflate category visibility.
  is_branded  boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, name)
);

create index intents_tenant_idx on intents (tenant_id);

create table visibility_prompts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  intent_id   uuid not null references intents(id) on delete cascade,
  text        text not null,
  language    text not null default 'pl',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, text)
);

create index visibility_prompts_intent_idx on visibility_prompts (intent_id);

-- ── Runs: one prompt, one platform, one execution ───────────────────────────

create table visibility_runs (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  prompt_id      uuid not null references visibility_prompts(id) on delete cascade,
  platform       ai_platform not null,
  model_version  text,
  source         measurement_source not null default 'toodip',
  executed_on    date not null,
  response_text  text,
  raw            jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index visibility_runs_tenant_date_idx on visibility_runs (tenant_id, executed_on desc);
create index visibility_runs_prompt_idx on visibility_runs (prompt_id);

create table visibility_mentions (
  id        uuid primary key default gen_random_uuid(),
  run_id    uuid not null references visibility_runs(id) on delete cascade,
  name      text not null,
  is_own    boolean not null default false,
  position  integer
);

create index visibility_mentions_run_idx on visibility_mentions (run_id);

create table visibility_citations (
  id      uuid primary key default gen_random_uuid(),
  run_id  uuid not null references visibility_runs(id) on delete cascade,
  url     text not null,
  domain  text not null,
  rank    integer
);

create index visibility_citations_run_idx on visibility_citations (run_id);
create index visibility_citations_domain_idx on visibility_citations (domain);

-- ── Interventions: the ledger that becomes the moat ─────────────────────────

create table interventions (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  kind           intervention_kind not null,
  -- Which surface was touched: google, site, instagram, guide, other.
  surface        text not null default 'other',
  description    text not null,
  performed_on   date not null default current_date,
  actor_user_id  uuid references auth.users(id) on delete set null,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index interventions_tenant_date_idx on interventions (tenant_id, performed_on desc);

-- ── Row level security ──────────────────────────────────────────────────────

create or replace function tenant_of_visibility_run(run uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from visibility_runs where id = run;
$$;

alter table intents enable row level security;
create policy "intents: read" on intents for select using (is_tenant_member(tenant_id));
create policy "intents: admin write" on intents for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

alter table visibility_prompts enable row level security;
create policy "vis prompts: read" on visibility_prompts for select using (is_tenant_member(tenant_id));
create policy "vis prompts: admin write" on visibility_prompts for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

alter table visibility_runs enable row level security;
create policy "vis runs: read" on visibility_runs for select using (is_tenant_member(tenant_id));
create policy "vis runs: admin write" on visibility_runs for all
  using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));

alter table visibility_mentions enable row level security;
create policy "vis mentions: read" on visibility_mentions for select
  using (is_tenant_member(tenant_of_visibility_run(run_id)));
create policy "vis mentions: admin write" on visibility_mentions for all
  using (is_tenant_admin(tenant_of_visibility_run(run_id)))
  with check (is_tenant_admin(tenant_of_visibility_run(run_id)));

alter table visibility_citations enable row level security;
create policy "vis citations: read" on visibility_citations for select
  using (is_tenant_member(tenant_of_visibility_run(run_id)));
create policy "vis citations: admin write" on visibility_citations for all
  using (is_tenant_admin(tenant_of_visibility_run(run_id)))
  with check (is_tenant_admin(tenant_of_visibility_run(run_id)));

-- Append only, like the activity log. A recorded intervention stands.
alter table interventions enable row level security;
create policy "interventions: read" on interventions for select using (is_tenant_member(tenant_id));
create policy "interventions: member insert" on interventions for insert
  with check (is_tenant_member(tenant_id));
