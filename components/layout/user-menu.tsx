"use client";

import { Building2, ChevronsUpDown, LogOut, UserCog } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { signOutAction, switchWorkspaceAction } from "@/app/actions/session";
import type { WorkspaceSummary } from "@/lib/auth/session";
import { roleLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { MemberRole } from "@/types/domain";

/**
 * Hand-rolled dropdown on purpose: the Base UI menu primitive hard-crashed the
 * browser tab on open (renderer death, reproduced locally and on production).
 * A profile menu needs a button, a panel and click-outside; it gets exactly
 * that and nothing that can loop.
 */

const itemClass =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

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
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const showWorkspaces = canSwitchWorkspace && workspaces.length > 1;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
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
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-60 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          <div className="px-2 py-1.5">
            <span className="block text-xs font-medium">{fullName}</span>
            <span className="block text-xs text-muted-foreground">{email}</span>
          </div>
          <div className="-mx-1 my-1 h-px bg-border" />

          <Link
            href="/account"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <UserCog />
            Account and password
          </Link>

          {showWorkspaces && (
            <>
              <div className="-mx-1 my-1 h-px bg-border" />
              <p className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Building2 className="size-3" />
                Workspace
              </p>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  disabled={workspace.id === activeWorkspaceId || pending}
                  onClick={() =>
                    startTransition(async () => {
                      await switchWorkspaceAction(workspace.id);
                      setOpen(false);
                      toast.success(`Now working in ${workspace.name}`);
                    })
                  }
                >
                  {workspace.name}
                </button>
              ))}
            </>
          )}

          <div className="-mx-1 my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            disabled={pending}
            onClick={() => startTransition(() => void signOutAction())}
          >
            <LogOut />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
