-- ============================================================================
--  Self-serve billing.
--
--  Billing state lives on the tenant. Plan limits and prices live in code
--  (lib/billing.ts), so changing a price never needs a migration. Stripe is
--  the source of truth for subscription status; the webhook mirrors it here.
-- ============================================================================

alter table tenants
  add column if not exists billing_plan text not null default 'free'
    check (billing_plan in ('free', 'starter', 'pro', 'agency')),
  add column if not exists billing_status text not null default 'none'
    check (billing_status in ('none', 'active', 'past_due', 'canceled')),
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_renews_at timestamptz;

-- Every workspace that exists today was set up by the platform team, so it is
-- agency managed and never hits self-serve limits. Only workspaces created
-- through public sign-up start on the free plan.
update tenants set billing_plan = 'agency', billing_status = 'active';
