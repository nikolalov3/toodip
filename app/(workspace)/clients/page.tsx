import { Building2 } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/common/surfaces";
import { AddClientForm } from "@/components/clients/add-client-form";
import { PlanSelect } from "@/components/clients/plan-select";
import { TrackerSnippet } from "@/components/clients/tracker-snippet";
import { WorkspacePicker } from "@/components/layout/workspace-picker";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { PLANS, type BillingPlan } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { suggestPassword } from "@/lib/password";
import { getServiceClient, getUserClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { effectivePlanFrom } from "@/services/billing";

export const metadata: Metadata = { title: "Clients" };

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  billing_plan: BillingPlan;
  billing_status: string;
  created_at: string;
  business_profiles: Array<{ city: string; district: string | null }>;
  tenant_members: Array<{ role: string }>;
  reviews: Array<{ count: number }>;
}

interface Usage {
  runs: number;
  costUsd: number;
}

interface JobSummary {
  status: "pending" | "running" | "done" | "failed";
  runs_done: number;
  runs_planned: number;
  runs_failed: number;
  error: string | null;
}

const JOB_STYLES: Record<JobSummary["status"], string> = {
  pending: "border-border bg-muted text-muted-foreground",
  running: "border-brand/30 bg-brand-soft text-brand",
  done: "border-positive/30 bg-positive-soft text-positive",
  failed: "border-critical/30 bg-critical-soft text-critical",
};

/**
 * This month's usage and report status per tenant. Read with the service role:
 * the platform admin is not a member of every workspace, and RLS on runs is
 * member-scoped. Runs and cost come from the monthly usage view, aggregated
 * in SQL. The jobs table may not exist yet in an environment; that just hides
 * the report column's content.
 */
async function loadUsage(): Promise<{
  usage: Map<string, Usage>;
  jobs: Map<string, JobSummary>;
  sites: Map<string, { id: string; domain: string | null }>;
}> {
  const service = getServiceClient();
  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;

  const [runsResult, jobsResult, sitesResult] = await Promise.all([
    // Aggregated in the database (one row per tenant), never by fetching runs:
    // PostgREST caps a row fetch at 1000, which would miscount silently.
    service
      .from("v_tenant_usage_monthly")
      .select("tenant_id, runs, cost_usd")
      .eq("month", monthStart)
      .limit(10000),
    service
      .from("measurement_jobs")
      .select("tenant_id, status, runs_done, runs_planned, runs_failed, error")
      .eq("scheduled_for", monthStart),
    service.from("stats_websites").select("id, tenant_id, domain").not("tenant_id", "is", null).limit(10000),
  ]);

  const usage = new Map<string, Usage>();
  for (const row of (runsResult.data ?? []) as Array<{
    tenant_id: string;
    runs: number | string;
    cost_usd: number | string | null;
  }>) {
    usage.set(row.tenant_id, { runs: Number(row.runs) || 0, costUsd: Number(row.cost_usd ?? 0) || 0 });
  }

  const sites = new Map<string, { id: string; domain: string | null }>();
  if (!sitesResult.error) {
    for (const site of (sitesResult.data ?? []) as Array<{ id: string; tenant_id: string; domain: string | null }>) {
      sites.set(site.tenant_id, { id: site.id, domain: site.domain });
    }
  }
  const jobs = new Map<string, JobSummary>();
  if (!jobsResult.error) {
    for (const job of (jobsResult.data ?? []) as Array<JobSummary & { tenant_id: string }>) {
      jobs.set(job.tenant_id, job);
    }
  }
  return { usage, jobs, sites };
}

export default async function ClientsPage() {
  const session = await requirePlatformAdmin();
  const supabase = await getUserClient();

  const [{ data }, { usage, jobs, sites }] = await Promise.all([
    supabase
      .from("tenants")
      .select(
        "id, name, slug, plan, billing_plan, billing_status, created_at, business_profiles(city, district), tenant_members(role), reviews(count)",
      )
      .order("created_at", { ascending: false }),
    loadUsage(),
  ]);

  const tenants = (data ?? []) as unknown as TenantRow[];
  const totalCost = [...usage.values()].reduce((sum, u) => sum + u.costUsd, 0);
  const totalRuns = [...usage.values()].reduce((sum, u) => sum + u.runs, 0);

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every workspace on the platform. Adding one creates the account you hand over."
        meta={
          <p className="text-xs text-muted-foreground">
            This month across all clients:{" "}
            <span className="text-numeric font-medium text-foreground">{totalRuns}</span>{" "}
            measurements ·{" "}
            <span className="text-numeric font-medium text-foreground">${totalCost.toFixed(2)}</span>{" "}
            AI cost
          </p>
        }
      />

      <div className="flex flex-col gap-4">
        <AddClientForm initialPassword={suggestPassword()} />

        <Panel className="overflow-hidden">
          <PanelHeader
            title="Workspaces"
            description="Open one to work inside it. Report, measurements and AI cost are for the current month."
          />
          {tenants.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No workspaces yet"
              description="Add the first client above and the workspace appears here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Business</th>
                    <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Location</th>
                    <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Plan</th>
                    <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Report</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Measurements</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">AI cost</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">People</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Reviews</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => {
                    const profile = tenant.business_profiles?.[0];
                    const active = tenant.id === session.tenantId;
                    const effective = effectivePlanFrom(tenant);
                    const limit = PLANS[effective].monthlyRuns;
                    const used = usage.get(tenant.id) ?? { runs: 0, costUsd: 0 };
                    const job = jobs.get(tenant.id);
                    const site = sites.get(tenant.id);
                    return (
                      <tr key={tenant.id} className="border-b border-border/70 last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tenant.name}</span>
                            {active && (
                              <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand">
                                open now
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                          {site ? (
                            <TrackerSnippet siteId={site.id} domain={site.domain} />
                          ) : (
                            <p className="mt-1 text-[11px] text-muted-foreground">no traffic site linked</p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {profile
                            ? [profile.district, profile.city].filter(Boolean).join(", ")
                            : "not set"}
                        </td>
                        <td className="px-3 py-3">
                          <PlanSelect tenantId={tenant.id} plan={tenant.billing_plan} />
                          {effective !== tenant.billing_plan && (
                            <span className="ml-1.5 text-[11px] text-caution" title="Paid plan without a live subscription">
                              lapsed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {limit <= 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : job ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                                JOB_STYLES[job.status],
                              )}
                              title={job.error ?? undefined}
                            >
                              {job.status}
                              {(job.status === "running" || job.status === "done") && (
                                <span className="text-numeric opacity-70">
                                  {job.runs_done}/{job.runs_planned}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">not scheduled</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-numeric text-muted-foreground">
                          {limit > 0 ? `${used.runs}/${limit}` : used.runs}
                        </td>
                        <td className="px-3 py-3 text-right text-numeric text-muted-foreground">
                          ${used.costUsd.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right text-numeric text-muted-foreground">
                          {tenant.tenant_members?.length ?? 0}
                        </td>
                        <td className="px-3 py-3 text-right text-numeric text-muted-foreground">
                          {tenant.reviews?.[0]?.count ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {formatDate(tenant.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Open a workspace"
            description="Switching changes every screen: dashboard, reviews, brand settings and the prompt."
          />
          <div className="p-4">
            <WorkspacePicker workspaces={session.workspaces} activeId={session.tenantId} />
          </div>
        </Panel>
      </div>
    </>
  );
}
