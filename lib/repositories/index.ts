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
export async function getRepository(): Promise<DataRepository> {
  if (repositoryMode() === "supabase") {
    throw new Error(
      "Supabase credentials are set but the Supabase adapter is not implemented yet. Run with DATA_SOURCE=demo or add lib/repositories/supabase.ts.",
    );
  }
  const sessionId = await getSessionId();
  return createDemoRepository(sessionId);
}
