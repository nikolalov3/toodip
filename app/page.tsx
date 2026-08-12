import {
  Check,
  ClipboardPaste,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { CONTACT_EMAIL, ContactForm } from "@/components/marketing/contact-form";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { PLANS, formatEur } from "@/lib/billing";
import { cn } from "@/lib/utils";

/**
 * Public landing page. Signed-in visitors go straight to their dashboard; for
 * everyone else this is the answer to "what is toodip" plus the two doors in:
 * sign up free, or write to the studio.
 */
export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: ClipboardPaste,
    title: "Paste a review",
    body: "Copy a Google review into the panel. It lands classified: sentiment, risk flags, and whether a human needs to sign off.",
  },
  {
    icon: Sparkles,
    title: "Get a reply in your voice",
    body: "The AI writes with your tone, your phrases and your rules. Refunds, staff names and legal threats never slip into a public answer.",
  },
  {
    icon: ShieldCheck,
    title: "Approve and publish",
    body: "You stay the editor. One click to approve, copy, and paste back into Google. Every step is logged.",
  },
];

const SELF_SERVE_PLANS = [PLANS.free, PLANS.starter, PLANS.pro];

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo size={28} wordmarkClassName="text-base" />
        <nav className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
            Start free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-widest text-brand">
            Reputation operations for local business
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Every Google review answered. In your voice, on time, with a human
            in charge.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            toodip drafts review replies that sound like your venue, guards the
            risky ones behind approval, and keeps a record of everything. Built
            for cafes, restaurants and the agencies that run them.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className={buttonVariants({})}>
              Create your workspace, free
            </Link>
            <p className="text-xs text-muted-foreground">
              No card needed. First replies in two minutes.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border py-14">
          <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-brand">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-numeric text-xs text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-brand">
              <Radar className="size-3.5" />
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                And beyond reviews:
              </span>{" "}
              toodip measures whether ChatGPT and other AI assistants recommend
              your venue, which sources they cite, and what to fix so they
              start. Reviews are the first move; visibility is the game.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-border py-14" id="pricing">
          <h2 className="text-lg font-semibold tracking-tight">Pricing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One subscription, cancel any time. Start free, upgrade when the
            replies earn their keep.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {SELF_SERVE_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-lg border border-border bg-card p-5",
                  plan.id === "pro" && "border-brand/40",
                )}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">{plan.name}</h3>
                  <p className="text-numeric text-sm">
                    {plan.priceCents === 0
                      ? "0 €"
                      : `${formatEur(plan.priceCents)} / mo`}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.blurb}</p>
                <ul className="mt-4 flex flex-1 flex-col gap-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-1.5 text-xs">
                      <Check className="mt-0.5 size-3 shrink-0 text-positive" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={buttonVariants({
                    size: "sm",
                    variant: plan.id === "pro" ? "default" : "outline",
                    className: "mt-5",
                  })}
                >
                  {plan.priceCents === 0 ? "Start free" : "Start free, upgrade inside"}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Running more than one venue, or want it done for you? That is the
            agency plan. Write to us below.
          </p>
        </section>

        {/* Contact */}
        <section className="border-t border-border py-14" id="contact">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Contact</h2>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Questions, agency plans, or a venue that needs the full
                visibility treatment. We read everything at {CONTACT_EMAIL}.
              </p>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6">
          <Logo size={22} wordmarkClassName="text-sm" />
          <p className="text-xs text-muted-foreground">
            A NotASlop product · {CONTACT_EMAIL}
          </p>
        </div>
      </footer>
    </div>
  );
}
