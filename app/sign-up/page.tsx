import { BadgeCheck, Check, Sparkles, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { Logo } from "@/components/brand/logo";
import { PLANS, formatEur } from "@/lib/billing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Start free" };

const TEASER_PLANS = [PLANS.free, PLANS.starter, PLANS.pro];

/**
 * The onboarding is a light panel on the dark page, on purpose: the marketing
 * site stays dark, the moment of starting is bright. The left half shows the
 * product doing its job as a picture, not a paragraph; the right half is the
 * form. `.light-island` flips the palette for the whole panel.
 */
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/">
          <Logo size={28} wordmarkClassName="text-base" />
        </Link>
        <p className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 sm:px-6">
        <div className="light-island overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-white/10">
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            {/* Left: how it works, as a picture */}
            <section className="hidden flex-col border-r border-border bg-gradient-to-b from-brand-soft/60 via-background to-background p-8 lg:flex">
              <h1 className="text-xl font-semibold tracking-tight">
                From a pasted review to a published reply
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                This is the whole loop. Two minutes of setup, then it looks
                like this every time.
              </p>

              {/* Step flow with connecting rail */}
              <div className="relative mt-7 flex flex-col gap-5">
                <span
                  aria-hidden
                  className="absolute top-4 bottom-4 left-[13px] w-px bg-border"
                />

                {/* Step 1: the review */}
                <div className="flex gap-4">
                  <span className="relative z-10 mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground">
                    1
                  </span>
                  <div className="flex-1 rounded-xl border border-border bg-card p-3.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">You paste a review</p>
                      <span className="flex gap-0.5 text-caution">
                        {[0, 1].map((i) => (
                          <Star key={i} className="size-3 fill-current" />
                        ))}
                        {[0, 1, 2].map((i) => (
                          <Star key={i} className="size-3" />
                        ))}
                      </span>
                    </div>
                    <p className="mt-2 rounded-md bg-muted px-2.5 py-2 text-xs italic text-muted-foreground">
                      &bdquo;Kawa świetna, ale czekaliśmy 25 minut i nikt nawet
                      nie podszedł&hellip;&rdquo;
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <span className="rounded-full bg-critical-soft px-2 py-0.5 text-[10px] font-medium text-critical">
                        negative
                      </span>
                      <span className="rounded-full bg-caution-soft px-2 py-0.5 text-[10px] font-medium text-caution">
                        service complaint
                      </span>
                      <span className="rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-medium text-info">
                        needs approval
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 2: the draft */}
                <div className="flex gap-4">
                  <span className="relative z-10 mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground">
                    2
                  </span>
                  <div className="flex-1 rounded-xl border border-brand/30 bg-card p-3.5 shadow-sm">
                    <p className="flex items-center gap-1.5 text-xs font-medium">
                      <Sparkles className="size-3.5 text-brand" />
                      AI drafts the reply, in your voice
                    </p>
                    <p className="mt-2 rounded-md bg-brand-soft px-2.5 py-2 text-xs leading-relaxed">
                      Dziękujemy za szczerość. 25 minut to za długo i nie ma co
                      tego tłumaczyć. Napisz do nas, proszę, kiedy to było,
                      wyjaśnimy to z zespołem&hellip;
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Your tone, your phrases. No refunds promised in public, no
                      staff names, escalation to a private channel.
                    </p>
                  </div>
                </div>

                {/* Step 3: approve */}
                <div className="flex gap-4">
                  <span className="relative z-10 mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground">
                    3
                  </span>
                  <div className="flex flex-1 items-center justify-between rounded-xl border border-border bg-card p-3.5 shadow-sm">
                    <p className="text-xs font-medium">
                      You approve, copy, publish
                    </p>
                    <span className="flex items-center gap-1.5 rounded-full bg-positive-soft px-2.5 py-1 text-[10px] font-semibold text-positive">
                      <BadgeCheck className="size-3.5" />
                      Published
                    </span>
                  </div>
                </div>
              </div>

              {/* Plans strip */}
              <div className="mt-auto pt-8">
                <div className="grid grid-cols-3 gap-2">
                  {TEASER_PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      className={cn(
                        "relative rounded-lg border border-border bg-card px-3 py-2.5",
                        plan.trialDays && "border-brand/40 ring-1 ring-brand/20",
                      )}
                    >
                      {plan.trialDays ? (
                        <span className="absolute -top-2 right-2 rounded-full bg-brand px-2 py-0.5 text-[9px] font-semibold text-brand-foreground">
                          {plan.trialDays} days free
                        </span>
                      ) : null}
                      <p className="text-xs font-semibold">{plan.name}</p>
                      <p className="text-numeric mt-0.5 text-xs text-muted-foreground">
                        {plan.priceCents === 0
                          ? "0 €"
                          : `${formatEur(plan.priceCents)}/mo`}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] text-muted-foreground">
                  Start free, no card. Upgrade inside when the replies earn
                  their keep. Pro begins with 7 days on us.
                </p>
              </div>
            </section>

            {/* Right: the form */}
            <section className="flex items-center justify-center bg-card p-6 sm:p-10">
              <div className="w-full max-w-sm">
                <h2 className="text-lg font-semibold tracking-tight">
                  Create your workspace
                </h2>
                <p className="mt-1 mb-6 text-sm text-muted-foreground">
                  Free plan, no card. Your venue, your voice, and the first
                  reply is ready to draft in two minutes.
                </p>

                <SignUpForm />

                <ul className="mt-6 flex flex-col gap-1.5">
                  {[
                    "3 free replies a month to try the workflow",
                    "Upgrade any time; Pro starts with 7 days free",
                    "Cancel from the billing page, no emails needed",
                  ].map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-1.5 text-xs text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-3 shrink-0 text-positive" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Prices include VAT. Invoice details and VAT ID are collected at
          checkout; invoices download from the billing portal.
        </p>
      </main>
    </div>
  );
}
