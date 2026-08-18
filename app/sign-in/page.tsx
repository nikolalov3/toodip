import { ShieldCheck, Timer, Workflow } from "lucide-react";
import type { Metadata } from "next";
import { DM_Mono, Instrument_Serif, Manrope } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";
import { supabaseConfigured } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import "@/app/auth.css";

export const metadata: Metadata = { title: "Sign in" };

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
          New here? <Link href="/sign-up">Create your workspace</Link>
        </p>
      </header>

      <main className="auth-main">
        <div className="auth-panel">
          {/* Left: why toodip */}
          <section className="auth-left">
            <p className="auth-eyebrow">
              <span className="dot" /> Reputation operations
            </p>
            <h1>
              Reputation operations for <em>local</em> business.
            </h1>
            <p className="auth-left-lead">
              Reviews arrive, get classified, get a draft in the venue&rsquo;s
              own voice and wait for the right person to approve them.
            </p>

            <div className="auth-highlights">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="auth-highlight">
                    <span className="auth-highlight-icon">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="auth-left-note">
              Start free in two minutes, no card needed.
            </p>
          </section>

          {/* Right: the form */}
          <section className="auth-right">
            <div className="auth-right-inner">
              <p className="auth-eyebrow">Welcome back</p>
              <h2>Sign in</h2>
              <p className="auth-right-lead">
                Use the address and password you were given. You can change the
                password from your account page once you are in.
              </p>

              {configured ? (
                <SignInForm next={next} />
              ) : (
                <p className="auth-warn">
                  Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
                  NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload.
                </p>
              )}

              <p className="auth-right-links">
                New here? <Link href="/sign-up">Create your workspace, free</Link>
              </p>
              <p className="auth-right-sub">
                Lost your password? Ask the person who set the workspace up.
                They can issue a new one.
              </p>
            </div>
          </section>
        </div>

        <p className="auth-foot">
          Reputation operations for local business, built in Europe.
        </p>
      </main>
    </div>
  );
}
