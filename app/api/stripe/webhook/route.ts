import type Stripe from "stripe";

import { getStripe, planForPrice, stripeConfigured } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase/server";

/**
 * Mirrors Stripe subscription state onto the tenant.
 *
 * Stripe is the source of truth; this handler only copies. It runs with the
 * service role because a webhook has no user session, and it is the second and
 * last place in the codebase where that key is used.
 */

function mapStatus(status: Stripe.Subscription.Status): string {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}

export async function POST(request: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe is not configured", { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = getServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.metadata?.tenant_id;
    const plan = session.metadata?.plan;
    const purchasable = ["starter", "pro", "visibility", "unlimited"];
    if (tenantId && plan && purchasable.includes(plan)) {
      await supabase
        .from("tenants")
        .update({
          billing_plan: plan,
          billing_status: "active",
          stripe_customer_id: String(session.customer ?? ""),
          stripe_subscription_id: String(session.subscription ?? ""),
        })
        .eq("id", tenantId);
    }
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const plan = planForPrice(subscription.items.data[0]?.price);
    const periodEnd = subscription.items.data[0]?.current_period_end;

    const patch: Record<string, unknown> = {
      billing_status:
        event.type === "customer.subscription.deleted"
          ? "canceled"
          : mapStatus(subscription.status),
      stripe_subscription_id: subscription.id,
      plan_renews_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    };
    if (plan) patch.billing_plan = plan;

    // Prefer the tenant pinned in metadata; fall back to the customer id.
    const tenantId = subscription.metadata?.tenant_id;
    const query = supabase.from("tenants").update(patch);
    if (tenantId) await query.eq("id", tenantId);
    else await query.eq("stripe_customer_id", String(subscription.customer));
  }

  return new Response("ok", { status: 200 });
}
