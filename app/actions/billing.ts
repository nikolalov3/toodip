"use server";

import { canEditSettings, requireSession } from "@/lib/auth/session";
import type { BillingPlan } from "@/lib/billing";
import { appUrl, getStripe, priceIdFor, stripeConfigured } from "@/lib/stripe";
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
  const priceId = priceIdFor(plan);
  if (!priceId) {
    return { ok: false, message: `The ${plan} plan has no Stripe price configured.` };
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

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/billing?upgraded=1`,
    cancel_url: `${appUrl()}/billing`,
    metadata: { tenant_id: session.tenantId, plan },
    subscription_data: { metadata: { tenant_id: session.tenantId, plan } },
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
