"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  changePasswordAction,
  updateOwnProfileAction,
  type AuthResult,
} from "@/app/actions/session";
import { Panel, PanelHeader } from "@/components/common/surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function useToastOnResult(state: AuthResult | null) {
  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
}

export function ProfileNameForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState<
    AuthResult | null,
    FormData
  >(updateOwnProfileAction, null);
  useToastOnResult(state);

  return (
    <Panel>
      <PanelHeader
        title="Your name"
        description="Shown on every action you take in the audit trail."
      />
      <form action={formAction} className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName" className="text-xs">
            Full name
          </Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={fullName}
            required
            className="max-w-sm"
          />
        </div>
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving..." : "Save name"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<
    AuthResult | null,
    FormData
  >(changePasswordAction, null);
  useToastOnResult(state);

  return (
    <Panel>
      <PanelHeader
        title="Password"
        description="Change the password you were given. Nobody else can read it, including the platform team."
      />
      <form action={formAction} className="flex flex-col gap-3 p-4">
        <div className="flex max-w-sm flex-col gap-1.5">
          <Label htmlFor="password" className="text-xs">
            New password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
          />
        </div>
        <div className="flex max-w-sm flex-col gap-1.5">
          <Label htmlFor="confirm" className="text-xs">
            Repeat it
          </Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          At least ten characters. This is the only lock on the workspace.
        </p>
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Changing..." : "Change password"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
