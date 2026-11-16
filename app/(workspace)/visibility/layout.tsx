import { Lock } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { EmptyState, PageHeader, Panel } from "@/components/common/surfaces";
import { PageTabs } from "@/components/panel/page-tabs";
import { SeriesSwitcher } from "@/components/panel/series-switcher";
import { buttonVariants } from "@/components/ui/button";
import { ProgressStrip, VISIBILITY_TABS } from "@/components/visibility/frame";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { PLANS } from "@/lib/billing";
import { getBillingSnapshot } from "@/services/billing";
import { getVisibilityOverview } from "@/services/visibility";

/** Measurement runs live inside server actions invoked from these routes. */
export const maxDuration = 60;

/**
 * The frame every AI Visibility view shares: title, tabs, the assistant
 * switcher and the note that a report is still being measured. The views
 * below it each answer one question about the same measurement.
 */
export default async function VisibilityLayout({ children }: { children: ReactNode }) {
  const [, billing] = await Promise.all([requireBusinessProfile(), getBillingSnapshot()]);
  const plan = PLANS[billing.effectivePlan];
  const canRead = plan.monthlyRuns > 0 || billing.effectivePlan === "pro";

  const header = (
    <PageHeader
      title="AI Visibility"
      description="Whether AI assistants recommend your venue when customers ask, who they name instead, and what to fix so they name you."
    />
  );

  if (!canRead) {
    return (
      <>
        {header}
        <Panel>
          <EmptyState
            icon={Lock}
            title="Part of the Visibility plan"
            description="Measure whether ChatGPT and Google AI recommend this venue, see which sources they cite, and track the score as you fix things."
          />
          <div className="flex justify-center pb-6">
            <Link href="/billing" className={buttonVariants({ size: "sm" })}>
              See plans
            </Link>
          </div>
        </Panel>
      </>
    );
  }

  // The default overview only feeds the switcher and the progress note; the
  // ledger behind it is read once per request and shared with the view.
  const overview = await getVisibilityOverview();

  return (
    <>
      {header}
      <Suspense fallback={<div className="mb-6 h-[41px] border-b border-border" />}>
        <PageTabs tabs={VISIBILITY_TABS} keep={["series", "period"]} label="AI Visibility views" />
      </Suspense>
      {overview.inProgress && <ProgressStrip progress={overview.inProgress} />}
      <Suspense fallback={null}>
        <SeriesSwitcher series={overview.series} defaultId={overview.current?.seriesId ?? null} />
      </Suspense>
      {children}
    </>
  );
}
