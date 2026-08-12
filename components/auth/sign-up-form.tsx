"use client";

import { useActionState } from "react";

import { signUpAction, type SignUpResult } from "@/app/actions/sign-up";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryLabels } from "@/lib/labels";
import type { BusinessCategory } from "@/types/domain";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<SignUpResult | null, FormData>(
    signUpAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="businessName" className="text-xs">
            Business name
          </Label>
          <Input id="businessName" name="businessName" required autoFocus placeholder="Cafe Przyklad" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category" className="text-xs">
            Category
          </Label>
          <select id="category" name="category" defaultValue="cafe" className={selectClass}>
            {(Object.keys(categoryLabels) as BusinessCategory[]).map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city" className="text-xs">
            City
          </Label>
          <Input id="city" name="city" required placeholder="Krakow" />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="fullName" className="text-xs">
            Your name
          </Label>
          <Input id="fullName" name="fullName" required autoComplete="name" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-xs">
            Email
          </Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-xs">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
          />
        </div>
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          className="rounded-md border border-critical/30 bg-critical-soft px-3 py-2 text-xs text-critical"
        >
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating your workspace..." : "Start free"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Free plan, no card. You upgrade only when the drafts earn it.
      </p>
    </form>
  );
}
