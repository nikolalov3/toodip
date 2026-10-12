-- ============================================================================
--  One client, one record: the traffic site from toodip stats becomes a
--  property of the workspace. A stats website carries tenant_id; everything
--  measured for it (visits, bot hits, AI measurements) is readable by the
--  workspace's members through the usual tenant membership, and the platform
--  creates the site when it creates the workspace. The owner-by-user policies
--  stay, so the current stats panel keeps working during the move.
-- ============================================================================

alter table stats_websites add column if not exists tenant_id uuid references tenants(id) on delete set null;
alter table stats_websites alter column user_id drop not null;
create unique index if not exists stats_websites_tenant_idx on stats_websites (tenant_id) where tenant_id is not null;

create policy "stats_websites: tenant members read" on stats_websites for select
  using (tenant_id is not null and is_tenant_member(tenant_id));
create policy "stats_websites: tenant admins write" on stats_websites for update
  using (tenant_id is not null and is_tenant_admin(tenant_id))
  with check (tenant_id is not null and is_tenant_admin(tenant_id));

-- Tenant of a stats website, for the tables that hang off it.
create or replace function tenant_of_stats_website(site uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from stats_websites where id = site;
$$;
revoke execute on function tenant_of_stats_website(uuid) from anon;

create policy "stats_events: tenant members read" on stats_events for select
  using (is_tenant_member(tenant_of_stats_website(website_id)));
create policy "stats_bot: tenant members read" on stats_bot_hits for select
  using (is_tenant_member(tenant_of_stats_website(website_id)));
create policy "stats_meas: tenant members read" on stats_measurements for select
  using (is_tenant_member(tenant_of_stats_website(website_id)));

-- The two sites that exist today, matched to workspaces by name when those
-- workspaces are created (clients.ts links on domain or name); nothing to
-- do here until then.
