import "server-only";

import { requireSession } from "@/lib/auth/session";
import {
  FAIR_USE_CAP,
  PLANS,
  repliesLimitFor,
  type BillingPlan,
} from "@/lib/billing";
import { getUserClient } from "@/lib/supabase/server";

/**
 * The billing questions the rest of the app is allowed to ask: what plan is
 * this workspace on, how much has it used this month, may it generate, and on
 * which engine. Nothing else reads the billing columns directly.
 */

export interface BillingSnapshot {
  plan: BillingPlan;
  /** Plan after checking the subscription is actually paid. */
  effectivePlan: BillingPlan;
  status: string;
  usageThisMonth: number;
  limit: number;
  remaining: number;
  canGenerate: boolean;
  /** Paid plans write with the AI engine; free runs the offline draft engine. */
  allowAi: boolean;
  blockedMessage: string | null;
  stripeCustomerId: string | null;
  renewsAt: string | null;
}

interface TenantBillingRow {
  billing_plan: BillingPlan;
  billing_status: string;
  stripe_customer_id: string | null;
  plan_renews_at: string | null;
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getBillingSnapshot(): Promise<BillingSnapshot> {
  const session = await requireSession();
  const supabase = await getUserClient();

  const [tenantResult, usageResult] = await Promise.all([
    supabase
      .from("tenants")
      .select("billing_plan, billing_status, stripe_customer_id, plan_renews_at")
      .eq("id", session.tenantId)
      .single(),
    // One review with a generated reply is one unit, however many drafts or
    // regenerations it took. Distinct reviews in the activity log this month.
    supabase
      .from("activity_logs")
      .select("entity_id")
      .eq("tenant_id", session.tenantId)
      .eq("action", "draft.generated")
      .gte("created_at", monthStartIso()),
  ]);

  const row = (tenantResult.data ?? {
    billing_plan: "free",
    billing_status: "none",
    stripe_customer_id: null,
    plan_renews_at: null,
  }) as TenantBillingRow;

  const usageThisMonth = new Set(
    (usageResult.data ?? []).map((r) => r.entity_id as string),
  ).size;

  // A paid plan without a live subscription behaves like free. Agency is
  // managed off-platform and never downgrades itself.
  const paidButLapsed =
    (row.billing_plan === "starter" || row.billing_plan === "pro") &&
    row.billing_status !== "active" &&
    row.billing_status !== "past_due";
  const effectivePlan: BillingPlan = paidButLapsed ? "free" : row.billing_plan;

  const limit = repliesLimitFor(effectivePlan);
  const remaining = Math.max(0, limit - usageThisMonth);
  const canGenerate = remaining > 0;

  const definition = PLANS[effectivePlan];
  const blockedMessage = canGenerate
    ? null
    : definition.monthlyReplies === null
      ? `Fair use cap of ${FAIR_USE_CAP} replies this month reached. Get in touch if this is a real workload.`
      : `The ${definition.name} plan includes ${definition.monthlyReplies} replies a month and this workspace has used them. Upgrade on the Billing page to keep going.`;

  return {
    plan: row.billing_plan,
    effectivePlan,
    status: row.billing_status,
    usageThisMonth,
    limit,
    remaining,
    canGenerate,
    allowAi: definition.aiEngine,
    blockedMessage,
    stripeCustomerId: row.stripe_customer_id,
    renewsAt: row.plan_renews_at,
  };
}
