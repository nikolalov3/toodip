"use client";

import { ChevronsUpDown, LogOut, RotateCcw, UserCog } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  resetDemoAction,
  signOutAction,
  switchUserAction,
} from "@/app/actions/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { roleLabels } from "@/lib/labels";
import type { DemoUserKey } from "@/lib/demo/seed";
import type { MemberRole } from "@/types/domain";

const SWITCHABLE: Array<{ key: DemoUserKey; name: string; role: MemberRole }> = [
  { key: "owner", name: "Marta Zielinska", role: "tenant_admin" },
  { key: "manager", name: "Jakub Nowak", role: "tenant_member" },
  { key: "operator", name: "Nikola Krecisz", role: "platform_admin" },
];

export function UserMenu({
  fullName,
  email,
  initials,
  role,
  userKey,
}: {
  fullName: string;
  email: string;
  initials: string;
  role: MemberRole;
  userKey: DemoUserKey;
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
        <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          <UserCog className="size-3" />
          Switch demo role
        </DropdownMenuLabel>
        {SWITCHABLE.map((user) => (
          <DropdownMenuItem
            key={user.key}
            disabled={user.key === userKey || pending}
            onClick={() =>
              startTransition(async () => {
                await switchUserAction(user.key);
                toast.success(`Now working as ${user.name}`);
              })
            }
          >
            <span className="flex-1">{user.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {roleLabels[user.role]}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await resetDemoAction();
              toast.success("Demo workspace restored");
            })
          }
        >
          <RotateCcw className="size-3.5" />
          Reset demo data
        </DropdownMenuItem>
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
