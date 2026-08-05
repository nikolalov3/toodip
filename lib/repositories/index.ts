import "server-only";

import { getSession, getSessionId } from "@/lib/auth/session";
import { createDemoRepository } from "@/lib/repositories/demo";
import { createSupabaseRepository } from "@/lib/repositories/supabase";
import { supabaseConfigured } from "@/lib/supabase/server";
import type { DataRepository } from "@/types/repository";

export type RepositoryMode = "demo" | "supabase";

/**
 * Which adapter is live.
 *
 * Switching to the database is an explicit decision, never an accident. The
 * Vercel integration drops Supabase credentials into a project the moment one is
 * linked, and that alone must not move a running deployment off demo data.
 * DATA_SOURCE is the only switch.
 */
export function repositoryMode(): RepositoryMode {
  return process.env.DATA_SOURCE === "supabase" ? "supabase" : "demo";
}

/**
 * Single entry point for persistence. Services, routes and screens only ever
 * see the `DataRepository` interface, never the adapter behind it.
 */
export async function getRepository(): Promise<DataRepository> {
  if (repositoryMode() === "supabase") {
    if (!supabaseConfigured()) {
      throw new Error(
        "DATA_SOURCE=supabase but NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
      );
    }
    const session = await getSession();
    if (!session) {
      throw new Error(
        "Supabase mode needs a signed in user, because every query is scoped to their workspace.",
      );
    }
    return createSupabaseRepository({ email: session.email });
  }

  const sessionId = await getSessionId();
  return createDemoRepository(sessionId);
}
