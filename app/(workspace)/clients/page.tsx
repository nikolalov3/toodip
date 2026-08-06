import { Building2 } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/common/surfaces";
import { AddClientForm } from "@/components/clients/add-client-form";
import { WorkspacePicker } from "@/components/layout/workspace-picker";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { suggestPassword } from "@/lib/password";
import { getUserClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clients" };

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  business_profiles: Array<{ city: string; district: string | null }>;
  tenant_members: Array<{ role: string }>;
  reviews: Array<{ count: number }>;
}

export default async function ClientsPage() {
  const session = await requirePlatformAdmin();
  const supabase = await getUserClient();

  const { data } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, plan, created_at, business_profiles(city, district), tenant_members(role), reviews(count)",
    )
    .order("created_at", { ascending: false });

  const tenants = (data ?? []) as unknown as TenantRow[];

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every workspace on the platform. Adding one creates the account you hand over."
      />

      <div className="flex flex-col gap-4">
        <AddClientForm initialPassword={suggestPassword()} />

        <Panel className="overflow-hidden">
          <PanelHeader
            title="Workspaces"
            description="Open one to work inside it. The whole panel switches to that client."
          />
          {tenants.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No workspaces yet"
              description="Add the first client above and the workspace appears here."
            />
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                    Business
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    Location
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    Plan
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    People
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    Reviews
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const profile = tenant.business_profiles?.[0];
                  const active = tenant.id === session.tenantId;
                  return (
                    <tr
                      key={tenant.id}
                      className="border-b border-border/70 last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tenant.name}</span>
                          {active && (
                            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand">
                              open now
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tenant.slug}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {profile
                          ? [profile.district, profile.city]
                              .filter(Boolean)
                              .join(", ")
                          : "not set"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {tenant.plan}
                      </td>
                      <td className="px-3 py-3 text-numeric text-muted-foreground">
                        {tenant.tenant_members?.length ?? 0}
                      </td>
                      <td className="px-3 py-3 text-numeric text-muted-foreground">
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
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Open a workspace"
            description="Switching changes every screen: dashboard, reviews, brand settings and the prompt."
          />
          <div className="p-4">
            <WorkspacePicker
              workspaces={session.workspaces}
              activeId={session.tenantId}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}
