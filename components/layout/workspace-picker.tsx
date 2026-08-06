"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { switchWorkspaceAction } from "@/app/actions/session";
import type { WorkspaceSummary } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export function WorkspacePicker({
  workspaces,
  activeId,
}: {
  workspaces: WorkspaceSummary[];
  activeId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <ul className="flex flex-wrap gap-2">
      {workspaces.map((workspace) => {
        const active = workspace.id === activeId;
        return (
          <li key={workspace.id}>
            <button
              type="button"
              disabled={pending || active}
              onClick={() =>
                startTransition(async () => {
                  await switchWorkspaceAction(workspace.id);
                  toast.success(`Now working in ${workspace.name}`);
                })
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active
                  ? "border-brand/40 bg-brand-soft font-medium text-brand"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {active && <Check className="size-3.5" />}
              {workspace.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
