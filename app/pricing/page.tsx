import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { CONTACT_EMAIL } from "@/components/marketing/contact-form";
import { buttonVariants } from "@/components/ui/button";
import { PLANS, formatEur, type PlanDefinition } from "@/lib/billing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Plans for the review reply desk and AI visibility measurement. Monthly subscriptions in EUR, 7-day trials on the bigger plans, cancel any time.",
};

export const dynamic = "force-dynamic";

const REPLY_LINE = [PLANS.free, PLANS.starter, PLANS.pro];
const VISIBILITY_LINE = [PLANS.visibility, PLANS.unlimited];

const FAQ = [
  {
    q: "How do trials work?",
    a: "Pro and Visibility start with 7 days free. You add a card at checkout, pay nothing for a week, and can cancel from the billing portal before the first charge.",
  },
  {
    q: "Do I get a VAT invoice?",
    a: "Yes. Checkout collects your billing address and VAT ID, and every invoice carries them. Invoices download from the billing portal in the panel.",
  },
  {
    q: "What counts as one reply?",
    a: "One review that had a reply generated this calendar month. Drafts, retries and regenerations of the same review are included in that one unit.",
  },
  {
    q: "What counts as one measurement?",
    a: "One question asked once against one AI platform, with the full answer, mentions and cited sources stored. A weekly battery of 25 questions is about 100 measurements a month per platform.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes, from the billing portal, effective at the end of the paid period. No emails, no phone calls.",
  },
  {
    q: "Running several venues?",
    a: `That is the agency plan, priced per portfolio. Write to ${CONTACT_EMAIL}.`,
  },
];

function PlanCard({
  plan,
  highlight,
}: {
  plan: PlanDefinition;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border border-border bg-card p-5",
        highlight && "border-brand/40 ring-1 ring-brand/20",
      )}
    >
      {plan.trialDays ? (
        <span className="absolute -top-2.5 right-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
          {plan.trialDays} days free
        </span>
      ) : null}
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{plan.name}</h3>
        <p className="text-numeric text-sm">
          {plan.priceCents === 0 ? "0 €" : `${formatEur(plan.priceCents)} / mo`}
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
          variant: highlight ? "default" : "outline",
          className: "mt-5",
        })}
      >
        {plan.priceCents === 0 ? "Start free" : "Start free, upgrade inside"}
      </Link>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/">
          <Logo size={28} wordmarkClassName="text-base" />
        </Link>
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

      <main className="mx-auto max-w-5xl px-6 pb-16">
        <section className="py-10">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pricing
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Two product lines, one panel. Monthly subscriptions billed in EUR,
            VAT invoices at checkout, cancellation from the billing portal.
            Every account starts free, with no card.
          </p>
        </section>

        <section className="border-t border-border py-10">
          <h2 className="text-base font-semibold tracking-tight">
            Review reply desk
          </h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            Paste a Google review, get a reply in the venue&apos;s voice,
            approve, publish. The plan decides how many replies a month and
            whether the AI model writes them.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {REPLY_LINE.map((plan) => (
              <PlanCard key={plan.id} plan={plan} highlight={plan.id === "pro"} />
            ))}
          </div>
        </section>

        <section className="border-t border-border py-10">
          <h2 className="text-base font-semibold tracking-tight">
            AI visibility measurement
          </h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            The full analysis panel: measurement batteries against ChatGPT,
            Google AI Overviews and Perplexity, share of voice, source maps,
            score trends and the intervention log. Includes everything in the
            reply desk.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {VISIBILITY_LINE.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                highlight={plan.id === "visibility"}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The Pro reply plan includes the visibility dashboard read only:
            imported baselines and past measurements, without running new ones.
          </p>
        </section>

        <section className="border-t border-border py-10">
          <h2 className="text-base font-semibold tracking-tight">
            Common questions
          </h2>
          <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q}>
                <h3 className="text-sm font-medium">{item.q}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </div>
            ))}
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
