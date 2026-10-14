import "server-only";

import { cache } from "react";

import { requireSession } from "@/lib/auth/session";
import { createSupabaseRepository } from "@/lib/repositories/supabase";
import { getUserClient } from "@/lib/supabase/server";
import type { DataRepository } from "@/types/repository";

/**
 * Single entry point for persistence.
 *
 * One adapter, one data path. Screens, routes and services only ever see the
 * `DataRepository` interface, and every query they cause runs under the signed
 * in user's row level security.
 */
export const getRepository = cache(async function getRepository(): Promise<DataRepository> {
  const session = await requireSession();
  const client = await getUserClient();

  return createSupabaseRepository({
    client,
    tenantId: session.tenantId,
    userId: session.userId,
  });
});
