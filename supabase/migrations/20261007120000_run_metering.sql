-- ============================================================================
--  Metering on visibility runs.
--
--  Every execution already records what it cost inside raw (jsonb). These typed
--  columns make the same numbers queryable: cost per report, per client, per
--  month — the basis for the admin usage view and for plan limits that track
--  money, not just counts. The runner writes them with a tolerant UPDATE, so an
--  environment that has not applied this migration keeps working (raw only).
-- ============================================================================

alter table visibility_runs add column if not exists tokens_in  integer;
alter table visibility_runs add column if not exists tokens_out integer;
alter table visibility_runs add column if not exists cost_usd   numeric(10, 6);

-- Monthly usage per tenant, as the admin view and plan checks will read it.
create or replace view v_tenant_usage_monthly as
select
  tenant_id,
  date_trunc('month', executed_on)::date as month,
  count(*)                                as runs,
  coalesce(sum(cost_usd), 0)              as cost_usd,
  coalesce(sum(tokens_in), 0)             as tokens_in,
  coalesce(sum(tokens_out), 0)            as tokens_out
from visibility_runs
where source = 'toodip'
group by tenant_id, date_trunc('month', executed_on);
