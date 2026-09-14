import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { GlobeBackground } from "@/components/marketing/globe-background";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

/** Expected public launch. Kept here so the copy and metadata agree. */
export const LAUNCH_LABEL = "Q4 2026";

/**
 * The public site while the product is pre-launch. A single, deliberate dark
 * treatment — this page does not follow the viewer's theme — so it reads as a
 * finished product teaser rather than an app screen. Its whole job: say when,
 * and take the waitlist. Sign-in stays reachable for existing clients.
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
        {/* Logo, presented as a medallion: the mark seated in a dark tile with a
            hairline ring and a soft cast, wordmark spaced beneath. */}
        <div className="flex flex-col items-center gap-4">
          <span className="relative inline-flex size-[4.25rem] items-center justify-center rounded-[1.15rem] border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_-16px_rgba(76,194,255,0.55)]">
            <span
              aria-hidden
              className="absolute inset-0 rounded-[1.15rem]"
              style={{ boxShadow: "0 0 0 1px rgba(76,194,255,0.16)" }}
            />
            <LogoMark size={40} />
          </span>
          <span className="text-lg font-semibold lowercase tracking-[0.34em] text-white/85">
            toodip
          </span>
        </div>

        <span className="mt-14 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
          <span className="size-1.5 rounded-full bg-[#4cc2ff] shadow-[0_0_10px_2px_rgba(76,194,255,0.6)]" />
          Launching {LAUNCH_LABEL}
        </span>

        <h1 className="mt-7 text-balance text-[1.9rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.65rem]">
          <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            When people ask AI where to go, your venue should be the answer.
          </span>
        </h1>

        <p className="mt-5 max-w-md text-pretty text-[0.95rem] leading-relaxed text-white/55">
          toodip tracks how often ChatGPT, Google AI Overviews and Perplexity
          put your business in front of people ready to visit — and turns every
          gap into a clear next move.
        </p>

        <div className="mt-10 w-full max-w-md">
          <p className="mb-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
            Request early access
          </p>
          <WaitlistForm locale={locale} />
        </div>

        <footer className="mt-16 flex items-center gap-4 text-xs text-white/40">
          <Link
            href="/sign-in"
            className="transition-colors hover:text-white/85"
          >
            Client sign in
          </Link>
          <span aria-hidden className="text-white/20">
            ·
          </span>
          <Link href="/terms" className="transition-colors hover:text-white/85">
            Terms &amp; privacy
          </Link>
        </footer>

        <p className="mt-8 text-[11px] tracking-wide text-white/25">
          © 2026 toodip
        </p>
      </div>
    </main>
  );
}
