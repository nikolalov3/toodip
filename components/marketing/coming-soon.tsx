import Link from "next/link";

import { PinMark } from "@/components/brand/logo";
import { GlobeBackground } from "@/components/marketing/globe-background";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

/**
 * The public site while the product is pre-launch. A single, deliberate dark
 * treatment — this page does not follow the viewer's theme — so it reads as a
 * finished product teaser rather than an app screen. Its whole job: say when,
 * and take the waitlist. Existing clients enter through the Members door;
 * there is no public sign-up.
 */
export function ComingSoon({ locale = "en" }: { locale?: string }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#070709] px-6 py-16 text-white">
      {/* Background: a rotating wireframe globe, plus a vignette that keeps the
          copy legible over it and a hairline catching the top edge. */}
      <GlobeBackground className="pointer-events-none absolute inset-0 h-full w-full" />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 50%, rgba(7,7,9,0.72) 0%, rgba(7,7,9,0.35) 45%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      </div>

      <div className="relative flex w-full max-w-lg flex-col items-center text-center">
        {/* Logo: the location pin from the favicon, in white with the brand
            signal dot and a soft cast, wordmark spaced beneath. */}
        <div className="flex flex-col items-center gap-3.5">
          <PinMark
            size={52}
            className="text-white"
            style={{ filter: "drop-shadow(0 8px 24px rgba(56,182,255,0.38))" }}
          />
          <span className="text-base font-semibold lowercase tracking-[0.34em] text-white/85 sm:text-lg">
            toodip
          </span>
        </div>

        <span className="mt-9 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-white/50 sm:mt-12 sm:text-[11px]">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#f6a94a] opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[#f6a94a]" />
          </span>
          Currently closed · Invite only
        </span>

        <h1 className="mt-6 text-balance text-[1.7rem] font-semibold leading-[1.14] tracking-tight sm:mt-6 sm:text-[2.65rem] sm:leading-[1.12]">
          <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            When people ask AI where to go, your venue should be the answer.
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-md text-pretty text-sm leading-relaxed text-white/55 sm:mt-5 sm:text-[0.95rem]">
          toodip already tracks how often ChatGPT, Google AI Overviews and
          Perplexity recommend a venue — and turns every gap into a clear next
          move. New venues come on in small, invite-only waves.
        </p>

        <div className="mt-8 w-full max-w-md sm:mt-10">
          <p className="mb-3 text-sm text-white/55">
            The next wave is filling. Leave your email to hold your place.
          </p>
          <WaitlistForm locale={locale} />
        </div>

        {/* Members: the one door for people who already hold a key. Framed as
            exclusive on purpose — no "create account" anywhere on the public
            site; access is granted, not signed up for. */}
        <section className="mt-12 w-full max-w-md sm:mt-14" aria-labelledby="members-title">
          <Link
            href="/sign-in"
            className="group relative block overflow-hidden border border-white/10 bg-white/[0.025] px-5 py-4 text-left transition-colors duration-300 hover:border-[rgba(76,194,255,0.45)] hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(76,194,255,0.5)]"
          >
            {/* a thin signal line that lights up on hover, like a key turning */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[rgba(76,194,255,0.0)] to-transparent transition-all duration-500 group-hover:via-[rgba(76,194,255,0.9)]"
            />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/45">
                  Members
                </p>
                <p id="members-title" className="mt-1.5 text-sm font-medium text-white/90">
                  Already hold access? Enter your workspace.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  Access is granted by invitation only. There is nothing to sign up for here —
                  if you were given credentials, this door is yours.
                </p>
              </div>
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center border border-white/10 text-white/60 transition-all duration-300 group-hover:border-[rgba(76,194,255,0.5)] group-hover:text-white group-hover:translate-x-0.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </div>
          </Link>
        </section>

        <footer className="mt-10 flex items-center gap-4 text-xs text-white/40 sm:mt-12">
          <Link href="/terms" className="transition-colors hover:text-white/85">
            Terms &amp; privacy
          </Link>
        </footer>

        <p className="mt-7 text-[11px] tracking-wide text-white/25 sm:mt-8">
          © 2026 toodip
        </p>
      </div>
    </main>
  );
}
