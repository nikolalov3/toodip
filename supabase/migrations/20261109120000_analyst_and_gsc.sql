-- ============================================================================
--  The analyst layer and Google Search Console.
--
--  analyses       one note per measurement period and method, written by a
--                 model from facts the panel already computed; the facts are
--                 stored next to the note so every sentence can be checked.
--  gsc_properties which Search Console property a workspace connected.
--  gsc_daily      Search Console rows (day x query x page), the first source
--                 outside the AI answers: what people type into Google,
--                 against what the assistants answer.
--
--  Reads under row level security ("own workspace"); writes come from the
--  panel (members) and from the cron (service role).
-- ============================================================================

create table if not exists analyses (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  -- Period key as the panel groups runs: YYYY-MM for a monthly report,
  -- YYYY-MM-DD for an imported or one-off measurement.
  period        text not null,
  period_start  date not null,
  -- source|model of the runs the note describes; notes never mix methods.
  method_key    text not null,
  model         text not null,
  headline      text not null,
  -- [{ "text": "...", "facts": ["f3", "f7"] }]
  points        jsonb not null default '[]'::jsonb,
  -- [{ "id": "f3", "text": "..." }] exactly as given to the model
  facts         jsonb not null default '[]'::jsonb,
  cost_usd      numeric(10, 6),
  created_by    text not null default 'panel',
  created_at    timestamptz not null default now()
);

create index if not exists analyses_tenant_period_idx
  on analyses (tenant_id, period_start desc, created_at desc);

alter table analyses enable row level security;

drop policy if exists "analyses: read" on analyses;
create policy "analyses: read" on analyses
  for select using (is_tenant_member(tenant_id));

drop policy if exists "analyses: member insert" on analyses;
create policy "analyses: member insert" on analyses
  for insert with check (is_tenant_member(tenant_id));

-- ── Google Search Console ───────────────────────────────────────────────────

create table if not exists gsc_properties (
  tenant_id       uuid primary key references tenants(id) on delete cascade,
  -- "sc-domain:belmont.cafe" or "https://belmont.cafe/", as Search Console names it.
  site_url        text not null,
  connected_at    timestamptz not null default now(),
  last_synced_on  date,
  last_error      text,
  updated_at      timestamptz not null default now()
);

create trigger gsc_properties_updated_at
  before update on gsc_properties
  for each row execute function set_updated_at();

alter table gsc_properties enable row level security;

drop policy if exists "gsc properties: read" on gsc_properties;
create policy "gsc properties: read" on gsc_properties
  for select using (is_tenant_member(tenant_id));

drop policy if exists "gsc properties: member write" on gsc_properties;
create policy "gsc properties: member write" on gsc_properties
  for all using (is_tenant_member(tenant_id)) with check (is_tenant_member(tenant_id));

create table if not exists gsc_daily (
  tenant_id    uuid not null references tenants(id) on delete cascade,
  day          date not null,
  query        text not null,
  page         text not null,
  clicks       integer not null default 0,
  impressions  integer not null default 0,
  position     numeric(6, 2),
  primary key (tenant_id, day, query, page)
);

create index if not exists gsc_daily_tenant_day_idx on gsc_daily (tenant_id, day desc);

alter table gsc_daily enable row level security;

drop policy if exists "gsc daily: read" on gsc_daily;
create policy "gsc daily: read" on gsc_daily
  for select using (is_tenant_member(tenant_id));
