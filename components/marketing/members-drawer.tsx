"use client";

import { useCallback, useEffect, useState } from "react";

import { SignInForm } from "@/components/auth/sign-in-form";

/**
 * The Members door and the sheet it opens. Signing in happens here, on the
 * same page, in a panel that rises from the bottom edge; no jump to another
 * screen. Escape, the backdrop and the close control all dismiss it. The
 * sign-in action itself redirects into the workspace on success, so nothing
 * else is needed once the form is submitted.
 */
export function MembersDrawer() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Members: enter your workspace"
        className="group relative mt-12 flex w-full max-w-md items-center gap-3.5 overflow-hidden border border-white/10 bg-white/[0.025] px-4 py-3.5 text-left transition-colors duration-300 hover:border-[rgba(76,194,255,0.45)] hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(76,194,255,0.5)] sm:mt-14"
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[rgba(76,194,255,0)] to-transparent transition-all duration-500 group-hover:via-[rgba(76,194,255,0.9)]"
        />
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center border border-white/10 text-white/70 transition-colors duration-300 group-hover:border-[rgba(76,194,255,0.5)] group-hover:text-white"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="15" r="4" />
            <path d="M10.85 12.15 19 4M18 5l2 2M15 8l2 2" />
          </svg>
        </span>
        <span className="flex-1 text-sm font-medium text-white/90">
          Already hold access? Enter your workspace.
        </span>
        <span
          aria-hidden
          className="shrink-0 text-white/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        </span>
      </button>

      <div
        className={`members-sheet ${open ? "is-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="members-backdrop" onClick={close} />
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="members-title"
          className="members-panel"
        >
          <div className="members-grip" aria-hidden />
          <div className="members-inner">
            <div className="members-head">
              <div>
                <p className="members-kicker">
                  <span className="rule" aria-hidden />
                  Members
                </p>
                <h2 id="members-title" className="members-title">
                  Sign in
                  <span className="members-sub">Your venue, in the AI&apos;s answer.</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="members-close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <p className="members-lead">
              Use the credentials you were given. You can change your password from your account page once inside.
            </p>

            {open && <SignInForm />}

            <p className="members-note">
              Lost your password? The person who opened your workspace can issue a new one.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
