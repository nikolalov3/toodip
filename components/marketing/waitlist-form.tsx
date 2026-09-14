"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useId, useState } from "react";

import { joinWaitlistAction } from "@/app/actions/waitlist";

/**
 * Pre-launch waitlist capture. Styled explicitly for the dark coming-soon page
 * rather than through the theme tokens, so it reads the same for every viewer.
 * Email plus a required terms checkbox; the consent is what the server keeps
 * with the address. On success the form is replaced by a confirmation.
 */
export function WaitlistForm({ locale = "en" }: { locale?: string }) {
  const termsId = useId();

  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-none border border-[rgba(76,194,255,0.25)] bg-[rgba(76,194,255,0.06)] px-4 py-4 text-left">
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[rgba(76,194,255,0.18)] text-[#7dd3fc]">
          <Check className="size-3.5" />
        </span>
        <div>
          <p className="text-sm font-medium text-white">{done}</p>
          <p className="mt-0.5 text-xs text-white/45">
            You&apos;ll hear from us the moment we open the doors — and nothing
            in between.
          </p>
        </div>
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!accepted) {
      setError("Please accept the terms to continue.");
      return;
    }
    setPending(true);
    const result = await joinWaitlistAction({ email, acceptTerms: accepted, locale });
    setPending(false);
    if (result.ok) setDone(result.message);
    else setError(result.message);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 text-left">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@venue.com"
          aria-label="Email address"
          disabled={pending}
          className="h-12 flex-1 rounded-none border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[rgba(76,194,255,0.5)] focus:bg-white/[0.06] focus:ring-4 focus:ring-[rgba(76,194,255,0.14)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex h-12 items-center justify-center gap-2 rounded-none bg-white px-5 text-sm font-semibold text-[#070709] transition hover:bg-white/90 disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Joining" : "Request access"}
          {!pending && (
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          )}
        </button>
      </div>

      <label
        htmlFor={termsId}
        className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-white/45"
      >
        <input
          id={termsId}
          type="checkbox"
          checked={accepted}
          onChange={(event) => {
            setAccepted(event.target.checked);
            if (event.target.checked) setError(null);
          }}
          disabled={pending}
          className="mt-0.5 size-4 shrink-0 rounded-none border-white/20 bg-white/5 accent-[#4cc2ff]"
        />
        <span>
          I agree to join the waitlist and accept the{" "}
          <Link
            href="/terms"
            className="text-white/70 underline underline-offset-2 transition-colors hover:text-white"
          >
            terms and privacy policy
          </Link>
          .
        </span>
      </label>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}
