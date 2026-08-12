import { Check } from "lucide-react";
import type { Metadata } from "next";

import {
  ManageBillingButton,
  UpgradeButton,
} from "@/components/billing/plan-actions";
import {
  MetricCard,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/common/surfaces";
import { canEditSettings, requireSession } from "@/lib/auth/session";
import { FAIR_USE_CAP, PLANS, formatEur } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { stripeConfigured } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { getBillingSnapshot, syncCheckoutSession } from "@/services/billing";

export const metadata: Metadata = { title: "Billing" };

const SELF_SERVE_PLANS = [
  PLANS.free,
  PLANS.starter,
  PLANS.pro,
  PLANS.visibility,
  PLANS.unlimited,
];

export default async function BillingPage({
  searchParams,
}: PageProps<"/billing">) {
  const session = await requireSession();

  // Back from Stripe Checkout: confirm the payment with Stripe and activate
  // the plan before rendering, so the page the buyer lands on is already paid.
  const params = await searchParams;
  const checkoutSessionId =
    typeof params.session_id === "string" ? params.session_id : null;
  const justUpgraded = checkoutSessionId
    ? await syncCheckoutSession(checkoutSessionId, session.tenantId)
    : false;

  const snapshot = await getBillingSnapshot();
  const stripeReady = stripeConfigured();
  const isAdmin = canEditSettings(session.role);
  const agencyManaged = snapshot.plan === "agency";

  const limitLabel =
    PLANS[snapshot.effectivePlan].monthlyReplies === null
      ? `fair use, up to ${FAIR_USE_CAP}`
      : String(snapshot.limit);

  return (
    <>
      <PageHeader
        title="Billing"
        description={
          agencyManaged
            ? "This workspace is managed by the NotASlop team. Billing happens under the service agreement, not here."
            : "One subscription, cancel any time. The plan decides how many replies a month and which engine writes them."
        }
      />

      {justUpgraded && (
        <div className="mb-4 rounded-md border border-positive/30 bg-positive-soft px-3 py-2.5 text-xs text-positive">
          Payment confirmed. The {PLANS[snapshot.plan].name} plan is active and
          the AI engine is on.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Plan"
          value={PLANS[snapshot.plan].name}
          hint={
            snapshot.plan !== snapshot.effectivePlan
              ? `Subscription ${snapshot.status}, running as ${PLANS[snapshot.effectivePlan].name}`
              : snapshot.status === "active" && snapshot.renewsAt
                ? `Renews ${formatDate(snapshot.renewsAt)}`
                : "No active subscription"
          }
        />
        <MetricCard
          label="Replies this month"
          value={`${snapshot.usageThisMonth} / ${limitLabel}`}
          hint="One review with a generated reply is one unit, drafts and retries included"
        />
        <MetricCard
          label="Engine"
          value={snapshot.allowAi ? "AI model" : "Draft engine"}
          hint={
            snapshot.allowAi
              ? "Replies written by the model"
              : "Upgrade to switch the AI model on"
          }
        />
      </div>

      {!agencyManaged && (
        <Panel className="mt-4">
          <PanelHeader
            title="Plans"
            description={
              stripeReady
                ? "Payments run through Stripe. Change or cancel whenever you like."
                : "Payments are not connected on this deployment yet, so the buttons are disabled."
            }
          />
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
            {SELF_SERVE_PLANS.map((plan) => {
              const current = snapshot.plan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "flex flex-col bg-card p-4",
                    current && "ring-1 ring-inset ring-brand/40",
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold">{plan.name}</h3>
                    <p className="text-numeric text-sm">
                      {plan.priceCents === 0
                        ? "0 €"
                        : `${formatEur(plan.priceCents)} / mo`}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{plan.blurb}</p>
                  <ul className="mt-3 flex flex-1 flex-col gap-1.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-1.5 text-xs">
                        <Check className="mt-0.5 size-3 shrink-0 text-positive" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isAdmin && plan.id !== "free" && (
                    <div className="mt-4">
                      <UpgradeButton
                        plan={plan.id}
                        current={current}
                        stripeReady={stripeReady}
                      />
                    </div>
                  )}
                  {isAdmin && plan.id === "free" && current && (
                    <p className="mt-4 text-center text-xs text-muted-foreground">
                      Current plan
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {!agencyManaged && isAdmin && (
        <Panel className="mt-4">
          <PanelHeader
            title="Invoices and payment method"
            description="Both live in the Stripe customer portal, along with cancelling."
          />
          <div className="p-4">
            <ManageBillingButton stripeReady={stripeReady} />
          </div>
        </Panel>
      )}
    </>
  );
}
