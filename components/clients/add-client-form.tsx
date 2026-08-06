"use client";

import { Check, Copy, Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createClientWorkspaceAction,
  type ClientResult,
} from "@/app/actions/clients";
import { Panel, PanelHeader } from "@/components/common/surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryLabels } from "@/lib/labels";
import { suggestPassword } from "@/lib/password";
import type { BusinessCategory } from "@/types/domain";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function AddClientForm({ initialPassword }: { initialPassword: string }) {
  const [state, formAction, pending] = useActionState<
    ClientResult | null,
    FormData
  >(createClientWorkspaceAction, null);
  const [password, setPassword] = useState(initialPassword);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  const credentials = state?.ok ? state.credentials : undefined;

  if (credentials) {
    const handover = `Panel: toodip\nWorkspace: ${credentials.workspace}\nLogin: ${credentials.email}\nPassword: ${credentials.password}`;
    return (
      <Panel>
        <PanelHeader
          title={`${credentials.workspace} is ready`}
          description="Hand these over now. The password is not stored anywhere you can read it again."
        />
        <div className="p-4">
          <pre className="overflow-x-auto rounded-md border border-border bg-muted/50 px-3 py-3 font-mono text-xs leading-relaxed">
            {handover}
          </pre>
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(handover);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  toast.error("The browser blocked clipboard access.");
                }
              }}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy the handover note"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => window.location.reload()}
            >
              Add another client
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tell them to change it from the account page after the first sign in.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title="Add a client"
        description="Creates the workspace, the owner account and a starting business profile in one go."
      />
      <form action={formAction} className="grid gap-4 p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="businessName" className="text-xs">
            Business name
          </Label>
          <Input id="businessName" name="businessName" required placeholder="Bruk Cafe" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category" className="text-xs">
            Category
          </Label>
          <select
            id="category"
            name="category"
            defaultValue="cafe"
            className={selectClass}
          >
            {(Object.keys(categoryLabels) as BusinessCategory[]).map(
              (category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city" className="text-xs">
            City
          </Label>
          <Input id="city" name="city" required placeholder="Krakow" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="district" className="text-xs">
            District
          </Label>
          <Input id="district" name="district" placeholder="Kazimierz" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ownerName" className="text-xs">
            Contact person
          </Label>
          <Input id="ownerName" name="ownerName" required placeholder="Filip Nowak" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ownerEmail" className="text-xs">
            Their email, this is the login
          </Label>
          <Input
            id="ownerEmail"
            name="ownerEmail"
            type="email"
            required
            placeholder="filip@brukcafe.pl"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="password" className="text-xs">
            Handover password
          </Label>
          <div className="flex gap-2">
            <Input
              id="password"
              name="password"
              required
              minLength={10}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="max-w-xs font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPassword(suggestPassword())}
            >
              New one
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Shown once after saving, so you can pass it on. They change it
            themselves from the account page.
          </p>
        </div>

        {state && !state.ok && (
          <p
            role="alert"
            className="rounded-md border border-critical/30 bg-critical-soft px-3 py-2 text-xs text-critical sm:col-span-2"
          >
            {state.message}
          </p>
        )}

        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            <Plus className="size-3.5" />
            {pending ? "Creating..." : "Create the workspace"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
