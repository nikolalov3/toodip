-- ============================================================================
--  Two plans for the visibility product line. The measurement runner is the
--  most expensive thing the app does, so it gets its own tier instead of
--  hiding inside Pro.
-- ============================================================================

alter table tenants drop constraint if exists tenants_billing_plan_check;
alter table tenants add constraint tenants_billing_plan_check
  check (billing_plan in ('free', 'starter', 'pro', 'visibility', 'unlimited', 'agency'));
