import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/common/module-placeholder";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireSession();

  return (
    <ModulePlaceholder
      icon={FileText}
      title="Reports"
      summary="The monthly document an agency sends a client, generated from the work the workspace already recorded."
      capabilities={[
        "Monthly summary per venue: volume, sentiment, reply rate, response time.",
        "Before and after on the metrics the client cares about.",
        "The audit trail rendered as evidence, not as a log dump.",
        "White label output with the agency logo and colours.",
        "Scheduled delivery by email on the first working day of the month.",
      ]}
      reuses={[
        "Dashboard metrics, computed from the same functions.",
        "Activity log as the source of the evidence section.",
        "Tenant and business profile for report headers.",
      ]}
      dependsOn={[
        "A PDF renderer.",
        "Report templates per plan tier.",
        "Scheduled delivery and email sending.",
      ]}
    />
  );
}
