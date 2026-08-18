import { BadgeCheck, Check, Sparkles, Star } from "lucide-react";
import type { Metadata } from "next";
import { DM_Mono, Instrument_Serif, Manrope } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { PLANS, formatEur } from "@/lib/billing";
import { cn } from "@/lib/utils";

import "@/app/auth.css";

export const metadata: Metadata = { title: "Start free" };

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
});
const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-mono",
});
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const TEASER_PLANS = [PLANS.free, PLANS.starter, PLANS.pro];

/**
 * Onboarding in the Evidence Atelier system, matching the public landing:
 * paper and ink, Signal Blue, DM Mono labels. The left half shows the loop as
 * a picture; the right half is the form. Plan facts come from lib/billing.
 */
export default function SignUpPage() {
  return (
    <div
      className={cn(
        "auth-shell",
        manrope.variable,
        dmMono.variable,
        instrumentSerif.variable,
      )}
    >
      <header className="auth-header">
        <Link href="/" className="auth-brand" aria-label="toodip">
          <Image
            src="/landing/signal-mark.png"
            alt=""
            width={29}
            height={29}
            priority
          />
          <span>toodip</span>
        </Link>
        <p className="auth-header-aside">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </header>

      <main className="auth-main">
        <div className="auth-panel">
          {/* Left: the loop, as a picture */}
          <section className="auth-left">
            <p className="auth-eyebrow">
              <span className="dot" /> How the loop runs
            </p>
            <h1>
              From a pasted review to a <em>published</em> reply
            </h1>
            <p className="auth-left-lead">
              Two minutes of setup, then it looks like this every time.
            </p>

            <div className="auth-steps">
              {/* Step 1 */}
              <div className="auth-step">
                <span className="auth-step-num">1</span>
                <div className="auth-card">
                  <div className="auth-card-head">
                    <span className="auth-card-title">You paste a review</span>
                    <span className="auth-stars" aria-hidden>
                      <Star className="size-3 fill-current" />
                      <Star className="size-3 fill-current" />
                      <Star className="empty size-3" />
                      <Star className="empty size-3" />
                      <Star className="empty size-3" />
                    </span>
                  </div>
                  <p className="auth-quote">
                    &bdquo;Great coffee, but we waited 25 minutes and nobody even
                    came over&hellip;&rdquo;
                  </p>
                  <div className="auth-tags">
                    <span className="auth-tag neg">negative</span>
                    <span className="auth-tag warn">service complaint</span>
                    <span className="auth-tag info">needs approval</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="auth-step">
                <span className="auth-step-num">2</span>
                <div className="auth-card auth-card-featured">
                  <span className="auth-card-title">
                    <Sparkles className="size-3.5" />
                    AI drafts the reply, in your voice
                  </span>
                  <p className="auth-quote auth-quote-blue">
                    Thank you for the honesty. 25 minutes is too long and there
                    is no excuse for it. Please write to us with the date and
                    we&rsquo;ll look into it with the team&hellip;
                  </p>
                  <p className="auth-note">
                    Your tone, your phrases. No refunds promised in public, no
                    staff names, escalation to a private channel.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="auth-step">
                <span className="auth-step-num">3</span>
                <div className="auth-card">
                  <div className="auth-card-head">
                    <span className="auth-card-title">
                      You approve, copy, publish
                    </span>
                    <span className="auth-published">
                      <BadgeCheck className="size-3.5" /> Published
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-plans">
              <div className="auth-plans-grid">
                {TEASER_PLANS.map((plan) => (
                  <div key={plan.id} className="auth-plan">
                    <p className="auth-plan-name">{plan.name}</p>
                    <p className="auth-plan-price">
                      {plan.priceCents === 0
                        ? "0 €"
                        : `${formatEur(plan.priceCents)}/mo`}
                    </p>
                  </div>
                ))}
              </div>
              <p className="auth-plans-note">
                Start free, no card. Upgrade inside when the replies earn their
                keep.
              </p>
            </div>
          </section>

          {/* Right: the form */}
          <section className="auth-right">
            <div className="auth-right-inner">
              <p className="auth-eyebrow">Start free</p>
              <h2>Create your workspace</h2>
              <p className="auth-right-lead">
                Free plan, no card. Your venue, your voice, and the first reply
                is ready to draft in two minutes.
              </p>

              <SignUpForm />

              <ul className="auth-checklist">
                {[
                  "3 free replies a month to try the workflow",
                  "Upgrade any time, straight from the billing panel",
                  "Cancel from the billing page, no emails needed",
                ].map((line) => (
                  <li key={line}>
                    <Check className="size-3.5" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <p className="auth-foot">
          Prices include VAT. Invoice details and VAT ID are collected at
          checkout; invoices download from the billing portal.
        </p>
      </main>
    </div>
  );
}
