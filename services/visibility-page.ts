import "server-only";

import { canEditSettings, requireSession, type Session } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { PLANS } from "@/lib/billing";
import { gscConfigured } from "@/lib/google/search-console";
import { getUserClient } from "@/lib/supabase/server";
import { getBillingSnapshot } from "@/services/billing";
import { loadGscSnapshot, type GscSnapshot } from "@/services/gsc";
import { getVisibilityOverview, type VisibilityOverview } from "@/services/visibility";
import type { BusinessProfile } from "@/types/domain";

export type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export interface VisibilityPage {
  session: Session;
  profile: BusinessProfile;
  overview: VisibilityOverview;
  gsc: GscSnapshot;
  /** `?series=…` appended to links that must keep the assistant on the page. */
  query: string;
  /** May run measurements: an admin on a plan that includes them. */
  canMeasure: boolean;
  /** May change the workspace's settings. */
  isAdmin: boolean;
  monthlyRuns: number;
}

/**
 * What every AI Visibility tab starts from: who is looking, and the overview
 * of the assistant and period named in the address (or the newest ones). One
 * place, so every tab counts the same answers the same way.
 */
export async function loadVisibilityPage(searchParams: PageSearchParams): Promise<VisibilityPage> {
  const params = await searchParams;
  const series = typeof params.series === "string" ? params.series : null;
  const period = typeof params.period === "string" ? params.period : null;

  const session = await requireSession();
  const supabase = await getUserClient();
  const [profile, billing, gsc] = await Promise.all([
    requireBusinessProfile(),
    getBillingSnapshot(),
    loadGscSnapshot(supabase, session.tenantId, gscConfigured()),
  ]);
  // Google demand, when connected, weighs into the order of question types and the plan.
  const overview = await getVisibilityOverview({ demand: gsc.connected ? gsc.demand : undefined, series, period });

  const carried = new URLSearchParams();
  if (overview.current && series) carried.set("series", overview.current.seriesId);
  if (overview.current && period && overview.current.period === period) carried.set("period", period);
  const monthlyRuns = PLANS[billing.effectivePlan].monthlyRuns;
  const isAdmin = canEditSettings(session.role);
  return {
    session,
    profile,
    overview,
    gsc,
    query: carried.toString() ? `?${carried.toString()}` : "",
    canMeasure: isAdmin && monthlyRuns > 0,
    isAdmin,
    monthlyRuns,
  };
}
