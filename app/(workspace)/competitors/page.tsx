import { BarChart3 } from "lucide-react";
import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/common/module-placeholder";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Competitors" };

export default async function CompetitorsPage() {
  await requireSession();

  return (
    <ModulePlaceholder
      icon={BarChart3}
      title="Competitors"
      summary="The venues competing for the same street, measured on the things that move a decision: rating, review velocity and how fast they answer."
      capabilities={[
        "A watchlist of nearby venues in the same category.",
        "Rating trend and review velocity next to your own.",
        "Reply rate and average reply time, which most venues lose on.",
        "What their reviewers praise and complain about, summarised.",
        "Alerts when a competitor gains reviews unusually fast.",
      ]}
      reuses={[
        "Business profile location and category define the competitive set.",
        "The same classification engine reads their reviews.",
        "Metrics definitions already used on the dashboard.",
      ]}
      dependsOn={[
        "A place data source for nearby venues.",
        "Storage for competitor snapshots over time.",
        "Rate limits and caching for repeated lookups.",
      ]}
    />
  );
}
