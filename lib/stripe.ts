import "server-only";

import Stripe from "stripe";

import type { BillingPlan } from "@/lib/billing";
import { PLANS } from "@/lib/billing";

/**
 * Stripe wiring, inert until the keys exist.
 *
 * Prices are created in the Stripe dashboard and referenced here by env var,
 * so a price change is a dashboard action plus one env edit, never a deploy
 * of new code.
 */

let cached: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "Stripe is not connected yet. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and the STRIPE_PRICE_* variables.",
    );
  }
  cached = new Stripe(key);
  return cached;
}

export function priceIdFor(plan: BillingPlan): string | null {
  const env = PLANS[plan].stripePriceEnv;
  if (!env) return null;
  return process.env[env]?.trim() || null;
}

export function planForPriceId(priceId: string): BillingPlan | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceEnv && process.env[plan.stripePriceEnv]?.trim() === priceId) {
      return plan.id;
    }
  }
  return null;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
