-- ============================================================================
--  Empty the database and set up the platform admin account.
--
--  Run this once, after creating your own account in the dashboard:
--  Authentication > Users > Add user > Create new user, with a real address,
--  a password you choose, and the option that confirms the email ticked.
--  Creating the user through the dashboard sets up the auth rows correctly,
--  which a hand written insert into auth.users does not.
--
--  Then change the two marked lines below and run the whole file.
--
--  Everything destructive happens inside the block, after the account has been
--  found. Running this unedited aborts before anything is deleted.
-- ============================================================================

do $$
declare
  admin_email     text := 'CHANGE_ME@example.com';   -- <= the address you created
  admin_name      text := 'CHANGE ME';               -- <= shown in the audit trail
  admin_user_id   uuid;
  platform_tenant uuid;
begin
  -- ── Check first. Nothing below runs until this passes. ────────────────────
  select id into admin_user_id from auth.users where email = admin_email;

  if admin_user_id is null then
    raise exception
      'No account for %. Create it in Authentication > Users first, then edit the two lines at the top of this block and run it again.',
      admin_email;
  end if;

  -- ── Wipe every workspace ──────────────────────────────────────────────────
  -- Cascades through business profiles, keyword banks, brand voice, reviews,
  -- risk flags, drafts, approvals and activity.
  delete from tenants;

  -- ── Remove the sample accounts that shipped with the first version ────────
  delete from auth.users
  where email in (
    'marta@cafekolektyw.pl',
    'jakub@cafekolektyw.pl',
    'ops@reviewreply.app'
  );

  -- ── Set up the platform admin ─────────────────────────────────────────────
  insert into profiles (user_id, full_name, email, avatar_initials)
  values (
    admin_user_id,
    admin_name,
    admin_email,
    upper(left(split_part(admin_name, ' ', 1), 1) || left(split_part(admin_name, ' ', 2), 1))
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        avatar_initials = excluded.avatar_initials;

  -- The platform team needs a workspace of its own, because the platform_admin
  -- role is carried on a membership row. It is an operations console, not a
  -- venue, so it deliberately has no business profile. Client workspaces are
  -- created from the Clients screen, not here.
  insert into tenants (name, slug, plan)
  values ('Platform', 'platform', 'agency')
  on conflict (slug) do update set name = excluded.name
  returning id into platform_tenant;

  insert into tenant_members (tenant_id, user_id, role, job_title)
  values (platform_tenant, admin_user_id, 'platform_admin', 'Platform operator')
  on conflict (tenant_id, user_id) do update set role = 'platform_admin';

  raise notice 'Platform admin ready: %', admin_email;
end $$;


-- ── Check ───────────────────────────────────────────────────────────────────
-- Expect one row: your address, role platform_admin, workspace Platform.

select p.email, m.role, t.name as workspace
from tenant_members m
join profiles p on p.user_id = m.user_id
join tenants t on t.id = m.tenant_id;
