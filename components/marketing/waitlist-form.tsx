"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { joinWaitlistAction } from "@/app/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

/**
 * Pre-launch waitlist capture. Email plus a required terms checkbox; the
 * consent is what the server persists alongside the address. On success the
 * form is replaced by a confirmation so the visitor cannot double-submit.
 */
export function WaitlistForm({ locale = "en" }: { locale?: string }) {
  const emailId = useId();
  const termsId = useId();

  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-positive/30 bg-positive-soft px-4 py-3.5 text-left">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-positive" />
        <div>
          <p className="text-sm font-medium text-foreground">{done}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            We only email you about the launch — no spam, unsubscribe anytime.
          </p>
        </div>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!accepted) {
      setError("Please accept the terms to join the list.");
      return;
    }
    setPending(true);
    const result = await joinWaitlistAction({ email, acceptTerms: accepted, locale });
    setPending(false);
    if (result.ok) setDone(result.message);
    else setError(result.message);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 text-left" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@venue.com"
          aria-label="Email address"
          aria-invalid={Boolean(error) && !email ? true : undefined}
          className="h-10 flex-1 rounded-xl px-3.5 text-sm"
          disabled={pending}
        />
        <Button
          type="submit"
          disabled={pending}
          className="h-10 rounded-xl px-5"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Joining…" : "Join the waitlist"}
        </Button>
      </div>

      <label
        htmlFor={termsId}
        className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground"
      >
        <Checkbox
          id={termsId}
          checked={accepted}
          onCheckedChange={(value) => {
            setAccepted(value === true);
            if (value === true) setError(null);
          }}
          className="mt-0.5"
          disabled={pending}
        />
        <span>
          I agree to join the toodip waitlist and accept the{" "}
          <Link
            href="/terms"
            className="text-brand underline underline-offset-2 hover:no-underline"
          >
            terms and privacy policy
          </Link>
          .
        </span>
      </label>

      {error && (
        <p className="text-xs font-medium text-critical" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
