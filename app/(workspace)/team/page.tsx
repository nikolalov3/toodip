import { Shield } from "lucide-react";
import type { Metadata } from "next";

import { Field, PageHeader, Panel, PanelHeader } from "@/components/common/surfaces";
import { requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import { getRepository } from "@/lib/repositories";
import type { MemberRole } from "@/types/domain";

export const metadata: Metadata = { title: "Team" };

const PERMISSIONS: Array<{
  capability: string;
  roles: Record<MemberRole, boolean>;
}> = [
  {
    capability: "Read reviews and drafts",
    roles: { platform_admin: true, tenant_admin: true, tenant_member: true },
  },
  {
    capability: "Generate and edit drafts",
    roles: { platform_admin: true, tenant_admin: true, tenant_member: true },
  },
  {
    capability: "Approve, reject and publish",
    roles: { platform_admin: true, tenant_admin: true, tenant_member: false },
  },
  {
    capability: "Change brand settings and keyword bank",
    roles: { platform_admin: true, tenant_admin: true, tenant_member: false },
  },
  {
    capability: "Inspect assembled prompts",
    roles: { platform_admin: true, tenant_admin: true, tenant_member: false },
  },
];

export default async function TeamPage() {
  const session = await requireSession();
  const repo = await getRepository();
  const [members, tenant] = await Promise.all([
    repo.listMembers(),
    repo.getTenant(),
  ]);

  return (
    <>
      <PageHeader
        title="Team"
        description={`Who can do what inside ${tenant.name}. Roles map one to one onto the row level security policies in the database schema.`}
      />

      <div className="flex flex-col gap-4">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Members"
            description="Invitations arrive with Supabase auth. Until then, switch roles from the user menu to test each permission set."
          />
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Role
                </th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Job title
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.userId}
                  className="border-b border-border/70 last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                        {member.initials}
                      </span>
                      <div>
                        <p className="font-medium">
                          {member.fullName}
                          {member.userId === session.userId && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              you
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-1.5 py-0.5 text-xs">
                      <Shield className="size-3 text-muted-foreground" />
                      {roleLabels[member.role]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {member.jobTitle ?? "not set"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {formatDate(member.joinedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader
            title="Permissions"
            description="What each role can do. Enforced in the services layer. The matching row level security policies take over once sign in moves to Supabase auth."
          />
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                  Capability
                </th>
                {(
                  ["tenant_member", "tenant_admin", "platform_admin"] as MemberRole[]
                ).map((role) => (
                  <th
                    key={role}
                    className="px-3 py-2 text-xs font-medium text-muted-foreground"
                  >
                    {roleLabels[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr
                  key={permission.capability}
                  className="border-b border-border/70 last:border-b-0"
                >
                  <td className="px-4 py-2.5">{permission.capability}</td>
                  {(
                    [
                      "tenant_member",
                      "tenant_admin",
                      "platform_admin",
                    ] as MemberRole[]
                  ).map((role) => (
                    <td key={role} className="px-3 py-2.5">
                      <span
                        className={
                          permission.roles[role]
                            ? "text-positive"
                            : "text-muted-foreground"
                        }
                      >
                        {permission.roles[role] ? "Yes" : "No"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel>
          <PanelHeader title="Workspace" />
          <dl className="grid gap-4 p-4 sm:grid-cols-4">
            <Field label="Name">{tenant.name}</Field>
            <Field label="Slug">{tenant.slug}</Field>
            <Field label="Plan">{tenant.plan}</Field>
            <Field label="Created">{formatDate(tenant.createdAt)}</Field>
          </dl>
        </Panel>
      </div>
    </>
  );
}
