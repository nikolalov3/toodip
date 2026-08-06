import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Two Supabase clients, with a deliberate split.
 *
 * getUserClient   carries the signed in user's token, so every query runs under
 *                 row level security. This is what the repository uses, and it
 *                 is why a bug in a query cannot leak another tenant's rows.
 *
 * getServiceClient bypasses row level security. Reserved for the few operations
 *                 that legitimately cross tenants: creating a client workspace
 *                 and the account behind it. Never used to serve a screen.
 */

function requireEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { url, anonKey };
}

export function supabaseConfigured(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** Request scoped, reads and writes the auth cookies. */
export async function getUserClient(): Promise<SupabaseClient> {
  const { url, anonKey } = requireEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot set cookies. The proxy refreshes the
          // session on every request, so this is safe to ignore here.
        }
      },
    },
  });
}

let serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Admin operations need SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
  }

  serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "review-reply-assistant" } },
  });
  return serviceClient;
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
