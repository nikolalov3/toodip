import "server-only";

import { requireSession } from "@/lib/auth/session";
import {
  FAIR_USE_CAP,
  PLANS,
  repliesLimitFor,
  type BillingPlan,
} from "@/lib/billing";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { getServiceClient, getUserClient } from "@/lib/supabase/server";

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
    // regenerations it took. Counted in the database: fetching rows and
    // deduping here would silently understate past PostgREST's 1000-row cap.
    supabase.rpc("replies_used_since", {
      p_tenant: session.tenantId,
      p_since: monthStartIso(),
    }),
  ]);

  const row = (tenantResult.data ?? {
    billing_plan: "free",
    billing_status: "none",
    stripe_customer_id: null,
    plan_renews_at: null,
  }) as TenantBillingRow;

  const usageThisMonth =
    typeof usageResult.data === "number" ? usageResult.data : 0;

  // A paid plan without a live subscription behaves like free. Agency is
  // managed off-platform and never downgrades itself.
  const paidButLapsed =
    row.billing_plan !== "free" &&
    row.billing_plan !== "agency" &&
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

/**
 * Confirms a finished checkout with Stripe and mirrors it onto the tenant.
 *
 * Runs when the billing page is opened with a session_id in the URL, which is
 * where Stripe sends the buyer back. This is what activates the plan on a
 * deployment with no webhook configured; with a webhook the write is the same
 * and idempotent. Uses the service role because billing columns are locked to
 * it — the buyer's word is never what flips the plan, Stripe's is.
 */
export async function syncCheckoutSession(
  sessionId: string,
  tenantId: string,
): Promise<boolean> {
  if (!stripeConfigured()) return false;
  try {
    const checkout = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    if (checkout.metadata?.tenant_id !== tenantId) return false;
    if (checkout.status !== "complete" || checkout.payment_status === "unpaid") {
      return false;
    }
    const plan = checkout.metadata?.plan;
    const purchasable = ["starter", "pro", "visibility", "unlimited"];
    if (!plan || !purchasable.includes(plan)) return false;

    const subscription =
      typeof checkout.subscription === "object" ? checkout.subscription : null;
    const periodEnd = subscription?.items.data[0]?.current_period_end;

    const result = await getServiceClient()
      .from("tenants")
      .update({
        billing_plan: plan,
        billing_status: "active",
        stripe_customer_id: String(checkout.customer ?? ""),
        stripe_subscription_id: subscription?.id ?? null,
        plan_renews_at: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      })
      .eq("id", tenantId);
    return !result.error;
  } catch {
    return false;
  }
}
