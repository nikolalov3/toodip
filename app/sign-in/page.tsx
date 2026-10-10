import { UserRound } from "lucide-react";
import type { Metadata } from "next";
import { DM_Mono, Instrument_Serif, Manrope } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SignalVisual } from "@/components/auth/signal-visual";
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
        <p className="auth-header-aside">Access by invitation</p>
      </header>

      <main className="auth-main">
        <div className="auth-panel auth-panel-signin">
          {/* Left: the form */}
          <section className="auth-form-col">
            <div className="auth-form-inner">
              <p className="auth-kicker">
                <span className="rule" aria-hidden="true" />
                Private access
              </p>
              <span className="auth-member-mark" role="img" aria-label="Members">
                <UserRound className="size-[18px]" strokeWidth={1.6} />
              </span>
              <h1>
                Sign in<span className="auth-h1-sub">Your venue, in the AI&apos;s answer.</span>
              </h1>
              <p className="auth-right-lead">
                Use the credentials you were given. toodip tracks how often ChatGPT, Google AI Overviews and Perplexity recommend you, and what to do next.
              </p>

              {configured ? (
                <SignInForm next={next} />
              ) : (
                <p className="auth-warn">
                  Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
                  NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload.
                </p>
              )}

              <p className="auth-right-sub">
                Lost your password? The person who opened your workspace can issue a new one.
              </p>
              <p className="auth-left-note">
                New venues come on in small, invite-only waves.
              </p>
            </div>
          </section>

          {/* Right: the product, moving */}
          <section className="auth-visual-col">
            <SignalVisual />
          </section>
        </div>

        <p className="auth-foot">
          Built in Europe for venues that want to be the answer.
        </p>
      </main>
    </div>
  );
}
