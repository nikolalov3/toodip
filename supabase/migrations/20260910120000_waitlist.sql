-- ============================================================================
--  Pre-launch waitlist for the public coming-soon site.
--
--  This is the one table the anonymous public may write to. It is write-only
--  for them: an insert policy gated on terms acceptance, and NO select policy,
--  so an email address, once left, can never be read back through the data API.
--  The team reads the list with the service role (SQL / admin), never the
--  browser. Consent is recorded inline (accepted_terms + terms_version) so the
--  record itself proves the box was ticked and against which version.
-- ============================================================================

create table waitlist_signups (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  locale         text not null default 'en',
  source         text not null default 'coming_soon',
  -- The consent, captured with the row it belongs to.
  accepted_terms boolean not null default false,
  terms_version  text not null default '2026-09',
  user_agent     text,
  created_at     timestamptz not null default now()
);

-- One signup per address, case-insensitive. A repeat submit updates nothing and
-- is reported to the visitor as "already on the list".
create unique index waitlist_signups_email_key
  on waitlist_signups (lower(email));

-- ── Row level security ──────────────────────────────────────────────────────

alter table waitlist_signups enable row level security;

-- The public form runs as anon (no session); the panel could also submit as an
-- authenticated user. Both may insert, and only when the terms box is ticked.
grant insert on waitlist_signups to anon, authenticated;

create policy "waitlist: public insert"
  on waitlist_signups for insert
  to anon, authenticated
  with check (accepted_terms = true);

-- No select, update or delete policy on purpose: emails are never served to the
-- browser, and a signup, once recorded, is not editable through the API.
