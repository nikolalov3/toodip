/**
 * Plans, prices and limits, in one place and in code.
 *
 * "Replies" counts reviews that had a reply generated this calendar month, not
 * draft variants: one review, one unit, however many drafts it took. The free
 * plan runs on the offline engine, which both caps the API bill at zero for
 * anonymous sign-ups and makes the upgrade pitch honest: paying is what turns
 * on the model.
 */

export type BillingPlan = "free" | "starter" | "pro" | "agency";

export interface PlanDefinition {
  id: BillingPlan;
  name: string;
  /** Monthly price in euro cents. Zero renders as free. */
  priceCents: number;
  /** Reviews with generated replies per calendar month. null = fair use cap. */
  monthlyReplies: number | null;
  /** Whether generation uses the AI engine or the offline draft engine. */
  aiEngine: boolean;
  blurb: string;
  features: string[];
  /** Env var holding the Stripe price id. Absent for unpurchasable plans. */
  stripePriceEnv?: string;
  /** Days of free trial at checkout. Card collected, first charge after. */
  trialDays?: number;
}

/** Hard stop for "unlimited", so one runaway loop cannot eat the API budget. */
export const FAIR_USE_CAP = 300;

export const PLANS: Record<BillingPlan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceCents: 0,
    monthlyReplies: 3,
    aiEngine: false,
    blurb: "Try the workflow on your own reviews.",
    features: [
      "3 replies a month",
      "Draft engine, no AI model",
      "Classification and risk flags",
      "Brand voice settings",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceCents: 499,
    monthlyReplies: 15,
    aiEngine: true,
    blurb: "For a venue answering a steady trickle of reviews.",
    features: [
      "15 AI replies a month",
      "Replies written by the AI model",
      "Approval workflow and audit trail",
      "Visibility dashboard",
    ],
    stripePriceEnv: "STRIPE_PRICE_STARTER",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 1999,
    monthlyReplies: null,
    aiEngine: true,
    blurb: "For a busy venue or one that cares about every reply.",
    features: [
      "First 7 days free",
      "Unlimited AI replies, fair use",
      "Visibility measurements from the panel",
      "Everything in Starter",
    ],
    stripePriceEnv: "STRIPE_PRICE_PRO",
    trialDays: 7,
  },
  agency: {
    id: "agency",
    name: "Agency managed",
    priceCents: 0,
    monthlyReplies: null,
    aiEngine: true,
    blurb: "Run by the NotASlop team under a service agreement.",
    features: ["No self-serve limits", "Billing handled off-platform"],
  },
};

export function formatEur(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function repliesLimitFor(plan: BillingPlan): number {
  const definition = PLANS[plan];
  return definition.monthlyReplies ?? FAIR_USE_CAP;
}
