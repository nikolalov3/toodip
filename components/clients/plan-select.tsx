"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setClientPlanAction } from "@/app/actions/clients";
import { PLANS, type BillingPlan } from "@/lib/billing";

/** The plan picker in the clients table. Platform admin only; one change, one save. */
export function PlanSelect({ tenantId, plan }: { tenantId: string; plan: BillingPlan }) {
  const router = useRouter();
  const [value, setValue] = useState<BillingPlan>(plan);
  const [pending, start] = useTransition();
  return (
    <select
      value={value}
      disabled={pending}
      aria-label="Plan"
      className="h-7 rounded-md border border-border bg-background px-1.5 text-xs text-foreground disabled:opacity-60"
      onChange={(event) => {
        const next = event.target.value as BillingPlan;
        setValue(next);
        start(async () => {
          const result = await setClientPlanAction(tenantId, next);
          if (result.ok) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.message);
            setValue(plan);
          }
        });
      }}
    >
      {(Object.keys(PLANS) as BillingPlan[]).map((id) => (
        <option key={id} value={id}>
          {PLANS[id].name}
          {PLANS[id].monthlyRuns > 0 ? ` · ${PLANS[id].monthlyRuns} runs` : ""}
        </option>
      ))}
    </select>
  );
}
