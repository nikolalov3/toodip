"use client";

import { ArrowUpRight, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  createCheckoutAction,
  openBillingPortalAction,
} from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import type { BillingPlan } from "@/lib/billing";

export function UpgradeButton({
  plan,
  current,
  stripeReady,
}: {
  plan: BillingPlan;
  current: boolean;
  stripeReady: boolean;
}) {
  const [pending, setPending] = useState(false);

  if (current) {
    return (
      <Button size="sm" variant="outline" disabled className="w-full">
        Current plan
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="w-full"
      disabled={pending || !stripeReady}
      title={stripeReady ? undefined : "Payments are not connected yet"}
      onClick={async () => {
        setPending(true);
        const result = await createCheckoutAction(plan);
        setPending(false);
        if (result.ok && result.url) window.location.assign(result.url);
        else toast.error(result.message);
      }}
    >
      <ArrowUpRight className="size-3.5" />
      {pending ? "Opening checkout..." : "Choose this plan"}
    </Button>
  );
}

export function ManageBillingButton({ stripeReady }: { stripeReady: boolean }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending || !stripeReady}
      onClick={async () => {
        setPending(true);
        const result = await openBillingPortalAction();
        setPending(false);
        if (result.ok && result.url) window.location.assign(result.url);
        else toast.error(result.message);
      }}
    >
      <CreditCard className="size-3.5" />
      {pending ? "Opening..." : "Invoices and payment method"}
    </Button>
  );
}
