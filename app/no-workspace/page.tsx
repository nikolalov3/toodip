import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/actions/session";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getUserClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "No workspace" };
export const dynamic = "force-dynamic";

/**
 * Signed in, but attached to no workspace. Reached only through the redirect in
 * requireSession, and deliberately outside the workspace layout, since that
 * layout is exactly what cannot render in this state.
 */
export default async function NoWorkspacePage() {
  const supabase = await getUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Logo size={30} wordmarkClassName="text-base" className="mb-8" />

        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <span className="flex size-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            <KeyRound className="size-4" />
          </span>

          <h1 className="mt-3 text-base font-semibold tracking-tight">
            This account has no workspace yet
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You are signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>,
            but the account is not a member of any business workspace. There is
            nothing to show until someone adds it to one.
          </p>

          <div className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <p className="text-xs font-medium">If this is your platform</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Run the third step of{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                supabase/bootstrap.sql
              </code>{" "}
              with this exact address. It creates the platform workspace and
              gives the account the platform admin role.
            </p>
          </div>

          <div className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <p className="text-xs font-medium">If you are a client</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Ask whoever gave you these credentials. Their end of the setup did
              not finish.
            </p>
          </div>

          <form action={signOutAction} className="mt-5">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
