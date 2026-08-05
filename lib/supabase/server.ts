import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server side Supabase client.
 *
 * This one holds the service role key, which bypasses row level security, so it
 * never leaves the server and never gets handed to a browser. Tenant scoping is
 * therefore the repository's job while this key is in use.
 *
 * When Supabase Auth lands, requests move to a per user client built from the
 * session token, RLS starts doing the isolation for real, and this client is
 * left only for jobs that legitimately need to cross tenants.
 */

let cached: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "review-reply-assistant" } },
  });

  return cached;
}

/** Turns a PostgREST error into something worth reading in a log. */
export function assertOk<T>(
  result: { data: T | null; error: { message: string; details?: string } | null },
  context: string,
): T {
  if (result.error) {
    throw new Error(
      `${context}: ${result.error.message}${result.error.details ? ` (${result.error.details})` : ""}`,
    );
  }
  if (result.data === null) {
    throw new Error(`${context}: no data returned`);
  }
  return result.data;
}
