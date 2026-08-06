-- ============================================================================
--  Empty the database and set up the platform admin account.
--
--  Run this once, in three steps, in the Supabase SQL editor.
--  Everything here is destructive. There is no sample data left afterwards.
-- ============================================================================


-- ── STEP 1. Wipe every workspace ────────────────────────────────────────────
-- Deleting the tenants cascades through business profiles, keyword banks,
-- brand voice, reviews, risk flags, drafts, approvals and activity.

delete from tenants;


-- ── STEP 2. Remove the old accounts ─────────────────────────────────────────
-- Only run this if you want the demo accounts gone. It deletes their profiles
-- through the cascade on auth.users. Skip it if you have real accounts already.

delete from auth.users
where email in (
  'marta@cafekolektyw.pl',
  'jakub@cafekolektyw.pl',
  'ops@reviewreply.app'
);


-- ── STEP 3. Create your own account, then run this block ────────────────────
--
--  Create the account first in the dashboard: Authentication > Users > Add
--  user. Use a real address and a password you choose, and tick the option that
--  confirms the email. Creating a user through the dashboard sets up the auth
--  rows correctly, which a hand written insert into auth.users does not.
--
--  Then put that same address below and run this block. It gives the account a
--  platform workspace and the platform_admin role, which is what unlocks the
--  Clients screen and the ability to see every workspace.

do $$
declare
  admin_email     text := 'CHANGE_ME@example.com';   -- <= the address you just created
  admin_name      text := 'CHANGE ME';               -- <= shown in the audit trail
  admin_user_id   uuid;
  platform_tenant uuid;
begin
  select id into admin_user_id from auth.users where email = admin_email;

  if admin_user_id is null then
    raise exception
      'No account for %. Create it in Authentication > Users first, then run this block again.',
      admin_email;
  end if;

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
  -- role is carried on a membership row. Client workspaces are created from the
  -- Clients screen, not here.
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
