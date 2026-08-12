"use server";

import { canEditSettings, requireSession } from "@/lib/auth/session";
import { PLANS, type BillingPlan } from "@/lib/billing";
import { appUrl, getStripe, resolvePriceId, stripeConfigured } from "@/lib/stripe";
import { getUserClient } from "@/lib/supabase/server";

export interface CheckoutResult {
  ok: boolean;
  message: string;
  url?: string;
}

/** Starts a Stripe Checkout for a purchasable plan. */
export async function createCheckoutAction(
  plan: BillingPlan,
): Promise<CheckoutResult> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) {
    return { ok: false, message: "Only the workspace owner can change the plan." };
  }
  if (!stripeConfigured()) {
    return {
      ok: false,
      message: "Payments are not connected yet. Stripe keys are missing on the server.",
    };
  }
  const priceId = await resolvePriceId(plan);
  if (!priceId) {
    return { ok: false, message: `The ${plan} plan is not purchasable.` };
  }

  const stripe = getStripe();
  const supabase = await getUserClient();

  const tenantResult = await supabase
    .from("tenants")
    .select("name, stripe_customer_id")
    .eq("id", session.tenantId)
    .single();
  if (tenantResult.error) return { ok: false, message: tenantResult.error.message };

  let customerId = tenantResult.data.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.email,
      name: tenantResult.data.name as string,
      metadata: { tenant_id: session.tenantId },
    });
    customerId = customer.id;
    const saved = await supabase
      .from("tenants")
      .update({ stripe_customer_id: customerId })
      .eq("id", session.tenantId);
    if (saved.error) return { ok: false, message: saved.error.message };
  }

  const trialDays = PLANS[plan].trialDays;
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // The session id in the return URL lets the billing page confirm the
    // payment with Stripe directly, so the plan activates even before any
    // webhook is configured.
    success_url: `${appUrl()}/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/billing`,
    metadata: { tenant_id: session.tenantId, plan },
    subscription_data: {
      metadata: { tenant_id: session.tenantId, plan },
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    },
    // Invoice data: Stripe collects the billing address and an optional tax id
    // (NIP) on the checkout form, stores both on the customer, and stamps them
    // on every invoice, which the buyer downloads from the customer portal.
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
  });

  if (!checkout.url) return { ok: false, message: "Stripe did not return a checkout URL." };
  return { ok: true, message: "Redirecting to checkout.", url: checkout.url };
}

/** Opens the Stripe customer portal for invoices, card changes and cancelling. */
export async function openBillingPortalAction(): Promise<CheckoutResult> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) {
    return { ok: false, message: "Only the workspace owner can manage billing." };
  }
  if (!stripeConfigured()) {
    return { ok: false, message: "Payments are not connected yet." };
  }

  const supabase = await getUserClient();
  const tenantResult = await supabase
    .from("tenants")
    .select("stripe_customer_id")
    .eq("id", session.tenantId)
    .single();
  const customerId = tenantResult.data?.stripe_customer_id as string | null;
  if (!customerId) {
    return { ok: false, message: "No Stripe customer yet. Pick a plan first." };
  }

  const portal = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/billing`,
  });
  return { ok: true, message: "Redirecting.", url: portal.url };
}
