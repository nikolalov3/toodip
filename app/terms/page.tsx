import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { TERMS_VERSION } from "@/lib/waitlist";

export const metadata: Metadata = {
  title: "Terms & privacy",
  robots: { index: false, follow: false },
};

/**
 * Provisional terms for the pre-launch waitlist. Deliberately short and honest:
 * the full agreement is finalized before launch. What matters now is being
 * clear about the one thing we collect (an email, with consent) and how to have
 * it removed.
 */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <Link href="/" className="inline-flex">
        <Logo size={28} />
      </Link>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight">
        Terms &amp; privacy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pre-launch waitlist · version {TERMS_VERSION}
      </p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          toodip is not yet publicly available. These provisional terms cover
          only the pre-launch waitlist. The full terms of service and privacy
          policy will be published here before launch, and anyone on the
          waitlist will be notified of them before the product opens.
        </p>

        <section>
          <h2 className="text-sm font-semibold text-foreground">
            What we collect
          </h2>
          <p className="mt-1.5">
            When you join the waitlist we store your email address, the fact and
            time that you accepted these terms, the version accepted, your
            interface language, and your browser&apos;s user agent. Nothing else.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">
            How we use it
          </h2>
          <p className="mt-1.5">
            We use your email only to tell you when toodip launches and to send
            occasional updates about that launch. We do not sell it, and we do
            not share it with third parties for their own marketing.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground">
            Your control
          </h2>
          <p className="mt-1.5">
            You can unsubscribe from any message we send, and you can ask us to
            delete your data at any time by writing to{" "}
            <a
              href="mailto:kontakt@notaslop.com"
              className="text-brand underline underline-offset-2 hover:no-underline"
            >
              kontakt@notaslop.com
            </a>
            . We remove waitlist entries on request without delay.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link
          href="/"
          className="text-sm text-brand underline underline-offset-2 hover:no-underline"
        >
          ← Back
        </Link>
      </div>
    </main>
  );
}
