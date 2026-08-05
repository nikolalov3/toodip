import { ArrowRight, ShieldCheck, Timer, Workflow } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signInFormAction } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { DEMO_USERS } from "@/lib/demo/seed";
import { roleLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  {
    icon: Timer,
    title: "Reply in minutes, not next week",
    body: "Every new review lands triaged, with a draft that already matches how the venue talks.",
  },
  {
    icon: ShieldCheck,
    title: "A human signs off what matters",
    body: "Complaints, hygiene, refunds and legal threats never reach the public without approval.",
  },
  {
    icon: Workflow,
    title: "One workflow across every venue",
    body: "Built multi tenant from the first table, so an agency runs ten locations the same way.",
  },
];

const DEMO_ACCOUNTS = [
  {
    key: "owner" as const,
    user: DEMO_USERS.owner,
    blurb: "Full access. Approves replies, edits brand settings.",
  },
  {
    key: "manager" as const,
    user: DEMO_USERS.manager,
    blurb: "Drafts and edits, cannot approve or change settings.",
  },
  {
    key: "operator" as const,
    user: DEMO_USERS.operator,
    blurb: "Platform side. Sees prompt internals and debug output.",
  },
];

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border bg-sidebar p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            RR
          </span>
          <span className="text-sm font-semibold">Review Reply Assistant</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reputation operations for local business.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Reviews arrive, get classified, get a draft in the venue&apos;s own
            voice and wait for the right person to approve them. The first
            module of a larger local visibility platform.
          </p>

          <ul className="mt-8 flex flex-col gap-5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-brand">
                    <Icon className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Demo workspace: Cafe Kolektyw, Kazimierz, Krakow.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              RR
            </span>
            <span className="text-sm font-semibold">
              Review Reply Assistant
            </span>
          </div>

          <h2 className="text-lg font-semibold tracking-tight">
            Open the workspace
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Authentication runs on Supabase once the database is connected. Until
            then, pick a role to see what that person can do.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            {DEMO_ACCOUNTS.map(({ key, user, blurb }) => (
              <form key={key} action={signInFormAction}>
                <input type="hidden" name="user" value={key} />
                <button
                  type="submit"
                  className="group flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-brand/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {user.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {user.fullName}
                      </span>
                      <span className="rounded-sm border border-border px-1 py-px text-[10px] text-muted-foreground">
                        {roleLabels[user.role]}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {blurb}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-border p-3">
            <p className="text-xs font-medium">Setting up a new venue?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The setup wizard collects the business profile, tone, banned
              phrases and keyword bank that every reply is built from.
            </p>
            <form action={signInFormAction} className="mt-3">
              <input type="hidden" name="user" value="owner" />
              <input type="hidden" name="next" value="/onboarding" />
              <Button type="submit" variant="outline" size="sm">
                Run the setup wizard
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
