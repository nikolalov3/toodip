import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { PageHeader, Panel, PanelHeader } from "@/components/common/surfaces";

/**
 * Planned modules render as a real page rather than a dead link. Each one says
 * what it will do, what it will reuse from the data already in the workspace,
 * and what has to exist first.
 */
export function ModulePlaceholder({
  icon: Icon,
  title,
  summary,
  capabilities,
  reuses,
  dependsOn,
}: {
  icon: LucideIcon;
  title: string;
  summary: string;
  capabilities: string[];
  reuses: string[];
  dependsOn: string[];
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={summary}
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
            <Icon className="size-3.5" />
            Planned module, not built yet
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="What it will do" />
          <ul className="divide-y divide-border">
            {capabilities.map((capability) => (
              <li key={capability} className="px-4 py-2.5 text-sm">
                {capability}
              </li>
            ))}
          </ul>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader
              title="Reuses what is already here"
              description="No second setup for the customer."
            />
            <ul className="flex flex-col gap-1.5 px-4 py-3">
              {reuses.map((item) => (
                <li key={item} className="text-xs text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Depends on" />
            <ul className="flex flex-col gap-1.5 px-4 py-3">
              {dependsOn.map((item) => (
                <li key={item} className="text-xs text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Working modules live under{" "}
        <Link href="/dashboard" className="text-brand hover:underline">
          Operations
        </Link>
        .
      </p>
    </>
  );
}
