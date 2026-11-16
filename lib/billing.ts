/**
 * Plans, prices and limits, in one place and in code.
 *
 * The product is measurement: every workspace gets traffic analytics for its
 * site, and the paid plans add AI visibility reports, metered in measurement
 * runs (one question asked once of one assistant). `monthlyReplies` and
 * `aiEngine` belong to the retired review-reply module; the columns and the
 * Starter and Pro plans stay only so existing rows keep resolving.
 */

export type BillingPlan =
  | "free"
  | "starter"
  | "pro"
  | "visibility"
  | "unlimited"
  | "agency";

export interface PlanDefinition {
  id: BillingPlan;
  name: string;
  /** Monthly price in euro cents. Zero renders as free. */
  priceCents: number;
  /** Reviews with generated replies per calendar month. null = fair use cap. */
  monthlyReplies: number | null;
  /** Whether generation uses the AI engine or the offline draft engine. */
  aiEngine: boolean;
  /** AI visibility measurement runs per month. Zero locks the module. */
  monthlyRuns: number;
  blurb: string;
  features: string[];
  /** Env var holding the Stripe price id. Absent for unpurchasable plans. */
  stripePriceEnv?: string;
  /** Days of free trial at checkout. Card collected, first charge after. */
  trialDays?: number;
}

/** Hard stop for "unlimited", so one runaway loop cannot eat the API budget. */
export const FAIR_USE_CAP = 300;

/**
 * Rough cost of one measurement execution (gpt-4.1-mini + web search +
 * extraction), for the estimate the panel shows before a run. Real cost is
 * metered per run; this is only the preview number.
 */
export const RUN_COST_ESTIMATE_USD = 0.035;

export const PLANS: Record<BillingPlan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceCents: 0,
    monthlyReplies: 3,
    aiEngine: false,
    monthlyRuns: 0,
    blurb: "Traffic analytics for your site: who visits, and whether AI sends them.",
    features: [
      "Visits, sources and landing pages",
      "Visits from ChatGPT, Perplexity, Gemini, Claude and Copilot",
      "AI crawler activity on your site",
      "Calls, directions and booking clicks as conversions",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceCents: 499,
    monthlyReplies: 15,
    aiEngine: true,
    monthlyRuns: 0,
    blurb: "Legacy plan from the retired review-reply product.",
    features: ["Same access as Free"],
    stripePriceEnv: "STRIPE_PRICE_STARTER",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 1999,
    monthlyReplies: null,
    aiEngine: true,
    monthlyRuns: 0,
    blurb: "Legacy plan from the retired review-reply product.",
    features: ["Same access as Free"],
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
  visibility: {
    id: "visibility",
    name: "Visibility",
    priceCents: 19900,
    monthlyReplies: null,
    aiEngine: true,
    // One full monthly report: 50 prompts × 2 repetitions. Failed executions
    // never insert a run, so they do not consume the allowance.
    monthlyRuns: 100,
    blurb: "Know whether AI recommends you, and what to do about it this month.",
    features: [
      "Monthly AI visibility report: up to 50 questions, asked twice each",
      "Question battery written for your business, editable",
      "Change since the last report, rivals, the sources behind every mention",
      "This month's plan, computed from the answers",
      "Everything in Free",
    ],
    stripePriceEnv: "STRIPE_PRICE_VISIBILITY",
  },
  unlimited: {
    id: "unlimited",
    name: "Unlimited",
    priceCents: 29900,
    monthlyReplies: null,
    aiEngine: true,
    monthlyRuns: 1000,
    blurb: "For venues and agencies that measure weekly or on several assistants.",
    features: [
      "1000 measurements a month, fair use",
      "Room for weekly reports and a second assistant",
      "Priority support",
      "Everything in Visibility",
    ],
    stripePriceEnv: "STRIPE_PRICE_UNLIMITED",
  },
  agency: {
    id: "agency",
    name: "Agency managed",
    priceCents: 0,
    monthlyReplies: null,
    aiEngine: true,
    monthlyRuns: 1000,
    blurb: "Run by the NotASlop team under a service agreement.",
    features: ["No self-serve limits", "Billing handled off-platform"],
  },
};

export function formatEur(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/**
 * A paid plan without a live subscription behaves like free. Agency is
 * managed off-platform and never downgrades itself. The one rule, in one place,
 * for the session path and the session-free (cron, admin) path alike.
 */
export function effectivePlanFrom(row: {
  billing_plan: BillingPlan;
  billing_status: string;
}): BillingPlan {
  const paidButLapsed =
    row.billing_plan !== "free" &&
    row.billing_plan !== "agency" &&
    row.billing_status !== "active" &&
    row.billing_status !== "past_due";
  return paidButLapsed ? "free" : row.billing_plan;
}

/**
 * Where a signed-in person lands. A workspace that pays for measurements
 * opens on AI Visibility; everyone else on the stats overview.
 */
/** Where a workspace lands: the report when its plan measures, the website module otherwise. */
export function landingPathFor(plan: BillingPlan): "/report" | "/overview" {
  return PLANS[plan].monthlyRuns > 0 ? "/report" : "/overview";
}

export function repliesLimitFor(plan: BillingPlan): number {
  const definition = PLANS[plan];
  return definition.monthlyReplies ?? FAIR_USE_CAP;
}
