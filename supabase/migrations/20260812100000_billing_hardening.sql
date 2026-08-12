-- ============================================================================
--  Billing hardening.
--
--  Usage was counted by selecting a month of activity_logs rows and deduping
--  in JS. PostgREST silently truncates at 1000 rows, so a busy tenant's count
--  would understate and the plan cap would stop holding. Counting moves into
--  the database, with an index shaped exactly like the query.
-- ============================================================================

create index if not exists activity_logs_generation_usage_idx
  on activity_logs (tenant_id, created_at)
  where action = 'draft.generated';

-- Distinct reviews that had a reply generated since p_since. Runs as the
-- caller, so RLS still scopes it to workspaces they belong to.
create or replace function replies_used_since(p_tenant uuid, p_since timestamptz)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(count(distinct entity_id), 0)::int
  from activity_logs
  where tenant_id = p_tenant
    and action = 'draft.generated'
    and created_at >= p_since;
$$;
