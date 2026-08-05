import "server-only";

import { getSessionId } from "@/lib/auth/session";
import { createDemoRepository } from "@/lib/repositories/demo";
import type { DataRepository } from "@/types/repository";

export type RepositoryMode = "demo" | "supabase";

export function repositoryMode(): RepositoryMode {
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return hasSupabase && process.env.DATA_SOURCE !== "demo"
    ? "supabase"
    : "demo";
}

/**
 * Single entry point for persistence.
 *
 * When the Supabase adapter is added it implements `DataRepository` in
 * `lib/repositories/supabase.ts` and gets returned here. Nothing else in the
 * codebase needs to change: services, routes and screens only know the
 * interface.
 */
let warnedAboutMissingAdapter = false;

export async function getRepository(): Promise<DataRepository> {
  if (repositoryMode() === "supabase") {
    // Asking for Supabase on purpose and not getting it is a real failure.
    if (process.env.DATA_SOURCE === "supabase") {
      throw new Error(
        "DATA_SOURCE=supabase but lib/repositories/supabase.ts does not exist yet. Implement DataRepository there, or drop DATA_SOURCE to fall back to demo.",
      );
    }
    // Credentials appearing on their own, usually from the Vercel integration,
    // must not take the whole app down. Fall back and say so once.
    if (!warnedAboutMissingAdapter) {
      warnedAboutMissingAdapter = true;
      console.warn(
        "[repositories] Supabase credentials found but no adapter is implemented. Running on demo data.",
      );
    }
  }
  const sessionId = await getSessionId();
  return createDemoRepository(sessionId);
}
