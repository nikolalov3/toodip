import { Check } from "lucide-react";
import type { Metadata } from "next";

import { MetricCard, PageHeader, Panel, PanelHeader } from "@/components/common/surfaces";
import { requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";
import { computeMetrics } from "@/services/metrics";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "one venue",
    features: [
      "One business profile",
      "Unlimited manual review entry",
      "Two drafts per generation",
      "Approval queue and audit trail",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "small chain",
    features: [
      "Up to five business profiles",
      "Google Business Profile sync when it ships",
      "Three drafts per generation",
      "Brand voice training and keyword bank per venue",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    price: "white label",
    features: [
      "Unlimited venues and client workspaces",
      "Client ready reports",
      "Role separation for account managers",
      "Priority on new platform modules",
    ],
  },
];

export default async function BillingPage() {
  await requireSession();
  const repo = await getRepository();
  const [tenant, reviews] = await Promise.all([
    repo.getTenant(),
    repo.listReviews(),
  ]);
  const metrics = computeMetrics(reviews);
  const draftsGenerated = reviews.reduce(
    (sum, review) => sum + review.drafts.length,
    0,
  );

  return (
    <>
      <PageHeader
        title="Billing"
        description="Usage is measured already. Payment is not connected yet, so nothing on this page charges anyone."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Current plan" value={tenant.plan} hint="Demo value" />
        <MetricCard
          label="Reviews this workspace"
          value={metrics.totalReviews}
          hint="All time"
        />
        <MetricCard
          label="Drafts generated"
          value={draftsGenerated}
          hint="Counts every variant, including edits"
        />
        <MetricCard
          label="Replies published"
          value={reviews.filter((review) => review.status === "published").length}
        />
      </div>

      <Panel className="mt-4">
        <PanelHeader
          title="Plans"
          description="Shaped around how many venues a customer runs, since that is what actually drives the work."
        />
        <div className="grid gap-px bg-border sm:grid-cols-3">
          {PLANS.map((plan) => {
            const current = plan.id === tenant.plan;
            return (
              <div
                key={plan.id}
                className={cn(
                  "bg-card p-4",
                  current && "ring-1 ring-inset ring-brand/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{plan.name}</h3>
                  {current && (
                    <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {plan.price}
                </p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-1.5 text-xs">
                      <Check className="mt-0.5 size-3 shrink-0 text-positive" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Invoices"
          description="Nothing to show. This section fills in once a payment provider is connected."
        />
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">
          No invoices yet.
        </p>
      </Panel>
    </>
  );
}
