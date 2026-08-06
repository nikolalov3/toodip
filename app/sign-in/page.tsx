import { ShieldCheck, Timer, Workflow } from "lucide-react";
import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Logo } from "@/components/brand/logo";
import { supabaseConfigured } from "@/lib/supabase/server";

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

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const configured = supabaseConfigured();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border bg-sidebar p-10 lg:flex">
        <Logo size={30} wordmarkClassName="text-base" />

        <div className="max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reputation operations for local business.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Reviews arrive, get classified, get a draft in the venue&apos;s own
            voice and wait for the right person to approve them.
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
          Accounts are created by the platform team. There is no public sign up.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Logo size={30} wordmarkClassName="text-base" className="mb-8 lg:hidden" />

          <h2 className="text-lg font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Use the address and password you were given. You can change the
            password from your account page once you are in.
          </p>

          {configured ? (
            <SignInForm next={next} />
          ) : (
            <p className="rounded-md border border-caution/30 bg-caution-soft px-3 py-2.5 text-xs text-caution">
              Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload.
            </p>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Lost your password? Ask the person who set the workspace up. They can
            issue a new one.
          </p>
        </div>
      </section>
    </div>
  );
}
