-- ============================================================================
--  Hardening before outside clients: the findings of the October 2026 audit.
--
--  1. Nobody can promote themselves to platform admin, and nobody edits their
--     own role: a trigger that only the service role bypasses.
--  2. The usage view runs with the caller's rights and is hidden from anon.
--  3. Measurement ledgers (runs, mentions, citations) are append-only for
--     users. The monthly allowance is no longer counted from those rows but
--     reserved atomically in a counter table through an RPC, so parallel calls
--     cannot overshoot and deleting rows cannot refill the quota.
--  4. A platform-wide daily AI spend cap, reserved the same atomic way.
--  5. A rate limiter in Postgres (one counter per key and window), usable from
--     the public waitlist and from signed-in actions alike.
--  6. The waitlist is written only by the server; anon loses direct insert.
--  7. Per-tenant jobs for the monthly report become a real queue: leases and
--     a claim function with SKIP LOCKED, so several workers can run at once
--     and every tenant gets a fair slice (least recently served first).
--  8. Helper functions that reveal a tenant id for a known uuid are no
--     longer callable by anon; the cross-tenant usage queries get their index.
-- ============================================================================

-- ── 1. Roles ────────────────────────────────────────────────────────────────

create or replace function guard_member_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The service role (platform tooling, sign-up, admin pages) and direct SQL
  -- are trusted. Only requests carrying a user's JWT are guarded.
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;
  if new.role = 'platform_admin'
     and (tg_op = 'INSERT' or old.role is distinct from 'platform_admin') then
    raise exception 'platform_admin can only be granted by the platform'
      using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.user_id = auth.uid() and new.role is distinct from old.role then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'A membership cannot be moved to another user' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists tenant_members_guard_role on tenant_members;
create trigger tenant_members_guard_role
  before insert or update on tenant_members
  for each row execute function guard_member_role();

-- ── 2. Usage view ───────────────────────────────────────────────────────────

alter view v_tenant_usage_monthly set (security_invoker = true);
revoke all on v_tenant_usage_monthly from anon;

-- ── 3. Append-only ledgers + atomic allowance ───────────────────────────────

drop policy if exists "vis runs: admin write" on visibility_runs;
create policy "vis runs: admin insert" on visibility_runs for insert
  with check (is_tenant_admin(tenant_id));

drop policy if exists "vis mentions: admin write" on visibility_mentions;
create policy "vis mentions: admin insert" on visibility_mentions for insert
  with check (is_tenant_admin(tenant_of_visibility_run(run_id)));

drop policy if exists "vis citations: admin write" on visibility_citations;
create policy "vis citations: admin insert" on visibility_citations for insert
  with check (is_tenant_admin(tenant_of_visibility_run(run_id)));

-- A run keeps its prompt's text even after the prompt leaves the battery.
alter table visibility_runs drop constraint if exists visibility_runs_prompt_id_fkey;
alter table visibility_runs alter column prompt_id drop not null;
alter table visibility_runs
  add constraint visibility_runs_prompt_id_fkey
  foreign key (prompt_id) references visibility_prompts(id) on delete set null;

create table if not exists tenant_run_counters (
  tenant_id  uuid not null references tenants(id) on delete cascade,
  month      date not null,
  runs       integer not null default 0,
  cost_usd   numeric(12, 6) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, month)
);
alter table tenant_run_counters enable row level security;
create policy "run counters: read own" on tenant_run_counters for select
  using (is_tenant_member(tenant_id));
-- No write policies: only the RPCs below (security definer) and the service role.

-- Reserves one measurement for this month. True when the plan still has room.
-- Atomic: the conditional update is one statement, so two parallel calls can
-- never both pass at the last slot.
create or replace function reserve_visibility_run(p_tenant uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_ok boolean := false;
begin
  if coalesce(auth.role(), '') = 'authenticated' and not is_tenant_admin(p_tenant) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into tenant_run_counters (tenant_id, month, runs)
    values (p_tenant, v_month, 0)
    on conflict (tenant_id, month) do nothing;
  update tenant_run_counters
    set runs = runs + 1, updated_at = now()
    where tenant_id = p_tenant and month = v_month and runs < p_limit;
  v_ok := found;
  return v_ok;
end;
$$;

-- Gives a reservation back when the provider call failed before anything was
-- recorded, and books the real cost when it succeeded.
create or replace function settle_visibility_run(p_tenant uuid, p_succeeded boolean, p_cost numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', now())::date;
begin
  if coalesce(auth.role(), '') = 'authenticated' and not is_tenant_admin(p_tenant) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_succeeded then
    update tenant_run_counters
      set cost_usd = cost_usd + coalesce(p_cost, 0), updated_at = now()
      where tenant_id = p_tenant and month = v_month;
  else
    update tenant_run_counters
      set runs = greatest(runs - 1, 0), updated_at = now()
      where tenant_id = p_tenant and month = v_month;
  end if;
end;
$$;

-- Runs used this month, for the panel and the admin list. Counts reservations
-- that stood, which is what the plan allows, not rows someone could delete.
create or replace function visibility_runs_used(p_tenant uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select runs from tenant_run_counters
    where tenant_id = p_tenant and month = date_trunc('month', now())::date
  ), 0);
$$;

revoke all on function reserve_visibility_run(uuid, integer) from public, anon;
revoke all on function settle_visibility_run(uuid, boolean, numeric) from public, anon;
revoke all on function visibility_runs_used(uuid) from public, anon;
grant execute on function reserve_visibility_run(uuid, integer) to authenticated, service_role;
grant execute on function settle_visibility_run(uuid, boolean, numeric) to authenticated, service_role;
grant execute on function visibility_runs_used(uuid) to authenticated, service_role;

-- Seed the counters from what already ran this month, so nobody gets a free
-- second allowance on the day this lands.
insert into tenant_run_counters (tenant_id, month, runs, cost_usd)
select tenant_id, date_trunc('month', executed_on)::date, count(*), coalesce(sum(cost_usd), 0)
from visibility_runs
where source = 'toodip' and executed_on >= date_trunc('month', now())::date
group by tenant_id, date_trunc('month', executed_on)
on conflict (tenant_id, month) do update
  set runs = greatest(tenant_run_counters.runs, excluded.runs),
      cost_usd = greatest(tenant_run_counters.cost_usd, excluded.cost_usd);

-- ── 4. Platform-wide daily spend cap ────────────────────────────────────────

create table if not exists platform_spend_daily (
  day       date primary key,
  cost_usd  numeric(12, 6) not null default 0,
  updated_at timestamptz not null default now()
);
alter table platform_spend_daily enable row level security;
-- No policies at all: service role and the RPC only.

-- Reserves an estimated amount against today's cap. False means the platform
-- stops spending until tomorrow, whichever tenant asked.
create or replace function reserve_platform_spend(p_estimate numeric, p_cap numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  if coalesce(auth.role(), '') = 'anon' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into platform_spend_daily (day) values (v_day) on conflict (day) do nothing;
  update platform_spend_daily
    set cost_usd = cost_usd + p_estimate, updated_at = now()
    where day = v_day and cost_usd + p_estimate <= p_cap;
  return found;
end;
$$;
revoke all on function reserve_platform_spend(numeric, numeric) from public, anon;
grant execute on function reserve_platform_spend(numeric, numeric) to authenticated, service_role;

-- ── 5. Rate limiter ─────────────────────────────────────────────────────────

create table if not exists rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         integer not null default 0
);
alter table rate_limits enable row level security;
-- No policies: the function below is the only door.

-- Fixed window per key. True when the call is allowed. Keys never contain
-- raw addresses: callers hash them.
create or replace function rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_hits integer;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, v_now, 1)
    on conflict (key) do update
      set hits = case when rate_limits.window_start + make_interval(secs => p_window_seconds) < v_now
                      then 1 else rate_limits.hits + 1 end,
          window_start = case when rate_limits.window_start + make_interval(secs => p_window_seconds) < v_now
                      then v_now else rate_limits.window_start end
    returning hits into v_hits;
  -- Keep the table small: drop windows that ended a day ago, now and then.
  if random() < 0.01 then
    delete from rate_limits where window_start < v_now - interval '1 day';
  end if;
  return v_hits <= p_limit;
end;
$$;
revoke all on function rate_limit_hit(text, integer, integer) from public;
grant execute on function rate_limit_hit(text, integer, integer) to anon, authenticated, service_role;

-- ── 6. Waitlist: server writes only ─────────────────────────────────────────

drop policy if exists "waitlist: public insert" on waitlist_signups;
revoke insert on waitlist_signups from anon, authenticated;

-- ── 7. Measurement jobs as a fair, lockable queue ───────────────────────────

alter table measurement_jobs add column if not exists lease_until timestamptz;
alter table measurement_jobs add column if not exists last_served_at timestamptz;
create index if not exists measurement_jobs_queue_idx
  on measurement_jobs (scheduled_for, status, last_served_at nulls first);

-- One job per entitled tenant for the month, in one statement. The plan rule
-- mirrors effectivePlanFrom() in services/billing.ts: a paid plan counts only
-- while its subscription is live; agency is managed off-platform.
create or replace function ensure_measurement_jobs(p_month date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into measurement_jobs (tenant_id, scheduled_for)
  select t.id, p_month
  from tenants t
  where t.billing_plan in ('visibility', 'unlimited', 'agency')
    and (t.billing_plan = 'agency' or t.billing_status in ('active', 'past_due'))
  on conflict (tenant_id, scheduled_for) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Hands a worker up to p_limit open jobs, least recently served first, and
-- leases them so another worker running at the same time takes different
-- ones. An expired lease (a worker that died) is simply claimable again.
create or replace function claim_measurement_jobs(p_month date, p_limit integer, p_lease_seconds integer)
returns setof measurement_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  update measurement_jobs j
    set status = 'running',
        lease_until = now() + make_interval(secs => p_lease_seconds),
        started_at = coalesce(j.started_at, now())
  where j.id in (
    select id from measurement_jobs
    where scheduled_for = p_month
      and status in ('pending', 'running')
      and (lease_until is null or lease_until < now())
    order by last_served_at nulls first, created_at
    for update skip locked
    limit p_limit
  )
  returning j.*;
end;
$$;

revoke all on function ensure_measurement_jobs(date) from public, anon, authenticated;
revoke all on function claim_measurement_jobs(date, integer, integer) from public, anon, authenticated;
grant execute on function ensure_measurement_jobs(date) to service_role;
grant execute on function claim_measurement_jobs(date, integer, integer) to service_role;

-- ── 8. Helpers and indexes ──────────────────────────────────────────────────

revoke execute on function tenant_of_business_profile(uuid) from anon;
revoke execute on function tenant_of_review(uuid) from anon;
revoke execute on function tenant_of_visibility_run(uuid) from anon;

create index if not exists visibility_runs_toodip_month_idx
  on visibility_runs (executed_on) where source = 'toodip';
