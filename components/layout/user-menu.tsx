"use client";

import { Building2, ChevronsUpDown, LogOut, UserCog } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { signOutAction, switchWorkspaceAction } from "@/app/actions/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceSummary } from "@/lib/auth/session";
import { roleLabels } from "@/lib/labels";
import type { MemberRole } from "@/types/domain";

export function UserMenu({
  fullName,
  email,
  initials,
  role,
  workspaces,
  activeWorkspaceId,
  canSwitchWorkspace,
}: {
  fullName: string;
  email: string;
  initials: string;
  role: MemberRole;
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string;
  canSwitchWorkspace: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        disabled={pending}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {initials}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-xs font-medium leading-tight">
            {fullName}
          </span>
          <span className="block truncate text-[11px] leading-tight text-muted-foreground">
            {roleLabels[role]}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-auto min-w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-xs font-medium">{fullName}</span>
          <span className="block text-xs text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/account" />}>
          <UserCog className="size-3.5" />
          Account and password
        </DropdownMenuItem>

        {canSwitchWorkspace && workspaces.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <Building2 className="size-3" />
              Workspace
            </DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                disabled={workspace.id === activeWorkspaceId || pending}
                onClick={() =>
                  startTransition(async () => {
                    await switchWorkspaceAction(workspace.id);
                    toast.success(`Now working in ${workspace.name}`);
                  })
                }
              >
                {workspace.name}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onClick={() => startTransition(() => void signOutAction())}
        >
          <LogOut className="size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
