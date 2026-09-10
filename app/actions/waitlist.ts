"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { getUserClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/waitlist";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  // The box must be ticked. A false here is a form the visitor left unchecked.
  acceptTerms: z.literal(true),
  locale: z.string().trim().toLowerCase().max(5).optional(),
});

export interface WaitlistResult {
  ok: boolean;
  message: string;
}

/**
 * Records one pre-launch waitlist signup from the public coming-soon page.
 *
 * Public on purpose: no session is required, so the insert runs as the anon
 * role and is gated by the RLS policy (terms accepted). Duplicate addresses are
 * a success from the visitor's side, not an error. The table is created by the
 * waitlist migration; until that migration is applied to the environment the
 * action fails soft with a clear message instead of a stack trace.
 */
export async function joinWaitlistAction(input: unknown): Promise<WaitlistResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const tookEmail = z.string().email().safeParse(
      (input as { email?: unknown })?.email,
    ).success;
    return {
      ok: false,
      message: tookEmail
        ? "Please accept the terms to join the list."
        : "Enter a valid email address.",
    };
  }

  const supabase = await getUserClient();
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;

  const result = await supabase.from("waitlist_signups").insert({
    email: parsed.data.email,
    locale: parsed.data.locale ?? "en",
    source: "coming_soon",
    accepted_terms: true,
    terms_version: TERMS_VERSION,
    user_agent: userAgent,
  });

  if (result.error) {
    // 23505: already on the list — treat as done, never leak that it existed
    // in a way that differs from a fresh signup.
    if (result.error.code === "23505") {
      return { ok: true, message: "You are on the list. We will be in touch." };
    }
    // 42P01 / PGRST205: the table is not deployed yet in this environment.
    if (
      result.error.code === "42P01" ||
      result.error.code === "PGRST205" ||
      /waitlist_signups/.test(result.error.message)
    ) {
      console.warn("[waitlist] table not deployed:", result.error.message);
      return {
        ok: false,
        message: "The waitlist is not open yet. Please try again shortly.",
      };
    }
    console.warn("[waitlist]", result.error.message);
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  return { ok: true, message: "You are on the list. We will be in touch." };
}
