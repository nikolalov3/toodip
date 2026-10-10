-- ============================================================================
--  Monthly measurement jobs — the queue behind the automated report.
--
--  One row per tenant per month. The cron picks pending/running jobs and
--  executes the battery a few runs at a time (bounded per invocation, so a
--  serverless function never hits its time cap), persisting progress here.
--  Idempotent by design: unique (tenant_id, scheduled_for) means a tick that
--  fires twice cannot create a second report, and runs_done/runs_failed make
--  every tick resumable from where the last one stopped.
-- ============================================================================

create type measurement_job_status as enum ('pending', 'running', 'done', 'failed');

create table measurement_jobs (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  -- First day of the month the report belongs to.
  scheduled_for  date not null,
  status         measurement_job_status not null default 'pending',
  runs_planned   integer not null default 0,
  runs_done      integer not null default 0,
  runs_failed    integer not null default 0,
  cost_usd       numeric(10, 6) not null default 0,
  error          text,
  started_at     timestamptz,
  finished_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, scheduled_for)
);

create index measurement_jobs_status_idx on measurement_jobs (status, scheduled_for);
create index measurement_jobs_tenant_idx on measurement_jobs (tenant_id, scheduled_for desc);

create trigger measurement_jobs_updated_at
  before update on measurement_jobs
  for each row execute function set_updated_at();

-- ── Row level security ──────────────────────────────────────────────────────
-- Tenants see their own report history; only the service role (the cron and
-- the admin tooling) writes.

alter table measurement_jobs enable row level security;

create policy "measurement jobs: read own"
  on measurement_jobs for select
  using (is_tenant_member(tenant_id));
