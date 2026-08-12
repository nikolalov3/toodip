import {
  ClipboardPaste,
  Eye,
  FileSearch,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
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
 * Public landing page. The lead product is AI visibility measurement, told
 * through what the tool actually records: answers, mentions, citations,
 * interventions. The reply desk is the second act. Signed-in visitors go
 * straight to their dashboard.
 */
export const dynamic = "force-dynamic";

const GATES = [
  {
    icon: Eye,
    title: "Does AI know you exist?",
    body: "Ask about your venue by name across ChatGPT, Google AI Overviews and Perplexity. If the answer is thin or wrong, the record work starts here.",
  },
  {
    icon: Radar,
    title: "Does AI recommend you?",
    body: "Ask the way real customers ask: best in the district, open late, good for working. Either your name is in the answer or a competitor's is.",
  },
  {
    icon: FileSearch,
    title: "Do the sources support you?",
    body: "Every answer cites somewhere: guides, Instagram, Google records, blogs. We map which domains feed each platform, and where you are missing.",
  },
];

const SOURCES_MOCK = [
  { domain: "instagram.com", count: 71, own: true },
  { domain: "krakow.com", count: 44, own: false },
  { domain: "kukbuk.pl", count: 38, own: false },
  { domain: "wanderlog.com", count: 26, own: false },
  { domain: "your-venue.com", count: 0, own: true },
];

const LEADERBOARD_MOCK = [
  { name: "Competitor A", share: 62 },
  { name: "Competitor B", share: 41 },
  { name: "Your venue", share: 18, own: true },
  { name: "Competitor C", share: 12 },
];

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo size={28} wordmarkClassName="text-base" />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/pricing"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Pricing
          </Link>
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
            AI visibility for local business, built in Europe
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Your next guest didn&apos;t search. They asked an AI, and it named
            three places.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            toodip asks ChatGPT, Google AI Overviews and Perplexity the
            questions your customers ask, records every answer, and shows you
            whether your name is in them. Then it shows which sources the AI
            trusted, so you know exactly what to fix. No magic, no promises.
            Evidence.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className={buttonVariants({})}>
              Measure your venue
            </Link>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "outline" })}
            >
              See pricing
            </Link>
          </div>
        </section>

        {/* Dashboard evidence strip */}
        <section className="border-t border-border py-14" id="how">
          <h2 className="text-lg font-semibold tracking-tight">
            What a measurement looks like
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            A battery of real customer questions runs against each platform.
            Every answer is stored with who was mentioned and what was cited.
          </p>
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {/* Share of voice mock */}
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium">
                Share of voice, category questions
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {LEADERBOARD_MOCK.map((row) => (
                  <li key={row.name} className="flex items-center gap-2.5 text-xs">
                    <span
                      className={cn(
                        "w-24 shrink-0 truncate",
                        row.own ? "font-semibold text-brand" : "text-muted-foreground",
                      )}
                    >
                      {row.name}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          row.own ? "bg-brand" : "bg-muted-foreground/40",
                        )}
                        style={{ width: `${row.share}%` }}
                      />
                    </span>
                    <span className="text-numeric w-8 text-right text-muted-foreground">
                      {row.share}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                The uncomfortable chart. Also the one that moves.
              </p>
            </div>
            {/* Sources mock */}
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium">Which sources feed the answers</p>
              <ul className="mt-3 flex flex-col gap-2">
                {SOURCES_MOCK.map((row) => (
                  <li
                    key={row.domain}
                    className="flex items-center justify-between text-xs"
                  >
                    <span
                      className={cn(
                        row.domain === "your-venue.com"
                          ? "font-semibold text-critical"
                          : "text-muted-foreground",
                      )}
                    >
                      {row.domain}
                    </span>
                    <span className="text-numeric text-muted-foreground">
                      {row.count} citations
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                When your own site has zero citations, that is not bad luck.
                That is the to-do list.
              </p>
            </div>
          </div>
        </section>

        {/* Three gates */}
        <section className="border-t border-border py-14">
          <h2 className="text-lg font-semibold tracking-tight">
            Three questions, in order
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {GATES.map((gate, index) => {
              const Icon = gate.icon;
              return (
                <div key={gate.title}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-brand">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-numeric text-xs text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-medium">{gate.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {gate.body}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-brand">
              <TrendingUp className="size-3.5" />
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                Then you fix things, and the line answers back.
              </span>{" "}
              Every change you make is logged next to the measurements, so when
              the score moves you know which work moved it. That log is the
              difference between a report and a method.
            </p>
          </div>
        </section>

        {/* Reply desk, second act */}
        <section className="border-t border-border py-14">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-brand">
                Also in the panel
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">
                The review reply desk
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Review replies are one of the sources AI reads, and the easiest
                one to control. Paste a Google review, get a reply in your own
                voice, approve it, publish it. Risky reviews never go out
                without a human. From {formatEur(PLANS.starter.priceCents)} a
                month, free to try.
              </p>
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-5")}
              >
                Try it on your reviews
              </Link>
            </div>
            <ul className="flex flex-col gap-3">
              {[
                {
                  icon: ClipboardPaste,
                  text: "Paste a review, it lands classified: sentiment, risk, who must sign off.",
                },
                {
                  icon: Sparkles,
                  text: "AI drafts in your tone, with your phrases and your rules baked in.",
                },
                {
                  icon: ShieldCheck,
                  text: "Refunds, staff names and legal threats never reach the public unapproved.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-brand">
                      <Icon className="size-3.5" />
                    </span>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.text}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="border-t border-border py-14">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Reply desk from {formatEur(PLANS.starter.priceCents)}. Visibility
                from {formatEur(PLANS.visibility.priceCents)}.
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Monthly subscriptions, 7 days free on the bigger plans, cancel
                any time. VAT invoices at checkout.
              </p>
            </div>
            <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
              Full pricing
            </Link>
          </div>
        </section>

        {/* Contact */}
        <section className="border-t border-border py-14" id="contact">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Contact</h2>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Questions, agency plans, or a venue that wants the measurement
                and the fixing done for it. We read everything at{" "}
                {CONTACT_EMAIL}.
              </p>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6">
          <Logo size={22} wordmarkClassName="text-sm" />
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/sign-up" className="hover:text-foreground">
              Start free
            </Link>
            <span>A NotASlop product · {CONTACT_EMAIL}</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
