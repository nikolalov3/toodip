import "server-only";

import Stripe from "stripe";

import type { BillingPlan } from "@/lib/billing";
import { PLANS } from "@/lib/billing";

/**
 * Stripe wiring, inert until the secret key exists.
 *
 * The secret key is the only required variable. Prices are looked up in Stripe
 * by a stable lookup key and created on first use when missing, so connecting
 * payments is one env var, not a dashboard session. A STRIPE_PRICE_* env var,
 * when set, overrides the lookup and pins a hand-made price instead.
 */

let cached: Stripe | null = null;

/** Stable ids for the prices this app owns inside the Stripe account. */
const LOOKUP_KEYS: Partial<Record<BillingPlan, string>> = {
  starter: "toodip_starter_eur",
  pro: "toodip_pro_eur",
  visibility: "toodip_visibility_eur",
  unlimited: "toodip_unlimited_eur",
};

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Stripe is not connected yet. Set STRIPE_SECRET_KEY.");
  }
  cached = new Stripe(key);
  return cached;
}

/**
 * Returns the Stripe price id for a purchasable plan: the env override if set,
 * an existing price found by lookup key otherwise, and failing both, a price
 * created on the spot with the amount from lib/billing.ts.
 */
export async function resolvePriceId(plan: BillingPlan): Promise<string | null> {
  const definition = PLANS[plan];
  const lookupKey = LOOKUP_KEYS[plan];
  if (!definition.stripePriceEnv || !lookupKey) return null;

  const fromEnv = process.env[definition.stripePriceEnv]?.trim();
  if (fromEnv) return fromEnv;

  const stripe = getStripe();
  const existing = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  if (existing.data[0]) return existing.data[0].id;

  const created = await stripe.prices.create({
    currency: "eur",
    unit_amount: definition.priceCents,
    recurring: { interval: "month" },
    lookup_key: lookupKey,
    product_data: { name: `toodip ${definition.name}` },
    metadata: { plan },
  });
  return created.id;
}

/** Maps a price coming back from Stripe to a plan, by lookup key or env pin. */
export function planForPrice(
  price: Stripe.Price | null | undefined,
): BillingPlan | null {
  if (!price) return null;
  for (const [plan, key] of Object.entries(LOOKUP_KEYS)) {
    if (price.lookup_key === key) return plan as BillingPlan;
  }
  for (const definition of Object.values(PLANS)) {
    if (
      definition.stripePriceEnv &&
      process.env[definition.stripePriceEnv]?.trim() === price.id
    ) {
      return definition.id;
    }
  }
  return null;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
