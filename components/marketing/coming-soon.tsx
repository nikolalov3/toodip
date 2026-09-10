import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

/** Expected public launch. Kept here so the copy and metadata agree. */
export const LAUNCH_LABEL = "Q4 2026";

/**
 * The public site while the product is pre-launch: the real landing is hidden,
 * and the page's whole job is to say when, and to capture the waitlist. Sign-in
 * stays reachable so existing clients and the agency still reach the panel.
 */
export function ComingSoon({ locale = "en" }: { locale?: string }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5 py-14">
      {/* A single contained glow, in the brand's neon, like the mark. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full opacity-[0.14] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--brand-neon), transparent)",
        }}
      />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <Logo size={34} wordmarkClassName="text-lg" />

        <span className="mt-9 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-neon opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
          </span>
          Under construction · launching {LAUNCH_LABEL}
        </span>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Something is being built here.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          toodip measures how often AI assistants like ChatGPT, Google AI
          Overviews and Perplexity recommend your venue — and shows you exactly
          what to fix so they do. We are putting on the finishing touches.
        </p>

        <div className="mt-8 w-full">
          <p className="mb-3 text-sm font-medium text-foreground">
            Be first in line when we launch.
          </p>
          <WaitlistForm locale={locale} />
        </div>

        <footer className="mt-12 flex items-center gap-3 text-xs text-muted-foreground">
          <Link href="/sign-in" className="hover:text-foreground">
            Client sign in
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-foreground">
            Terms &amp; privacy
          </Link>
          <span aria-hidden>·</span>
          <a
            href="mailto:kontakt@notaslop.com"
            className="hover:text-foreground"
          >
            Contact
          </a>
        </footer>
      </div>
    </main>
  );
}
