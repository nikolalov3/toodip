import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { Logo } from "@/components/brand/logo";
import { PLANS, formatPln } from "@/lib/billing";

export const metadata: Metadata = { title: "Start free" };

const TEASER_PLANS = [PLANS.free, PLANS.starter, PLANS.pro];

export default function SignUpPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border bg-sidebar p-10 lg:flex">
        <Logo size={30} wordmarkClassName="text-base" />

        <div className="max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight">
            Every review answered. In your voice, on time.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Paste a Google review, get a reply that sounds like your venue,
            approve it, publish it. Risky reviews never go out without you.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {TEASER_PLANS.map((plan) => (
              <div
                key={plan.id}
                className="rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <p className="text-numeric text-sm">
                    {plan.priceGrosze === 0 ? "0 zł" : `${formatPln(plan.priceGrosze)} / mies.`}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{plan.blurb}</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {plan.features.slice(0, 2).map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3 text-positive" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Prices include VAT. Cancel any time from the billing page.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Logo size={30} wordmarkClassName="text-base" className="mb-8 lg:hidden" />

          <h2 className="text-lg font-semibold tracking-tight">Create your workspace</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Two minutes of setup: your venue, your voice, and the first reply is
            ready to draft.
          </p>

          <SignUpForm />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
