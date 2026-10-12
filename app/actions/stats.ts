"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canEditSettings, requireSession } from "@/lib/auth/session";
import { getServiceClient } from "@/lib/supabase/server";

/**
 * Links a traffic site to the workspace: adopts an unlinked stats site with
 * the same domain (one that was added in the old stats panel), otherwise
 * creates one. Service role, because the site rows predate tenant ownership
 * and anon-created rows have no tenant to pass RLS with.
 */
export async function linkSiteAction(input: unknown): Promise<{ ok: boolean; message: string }> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) return { ok: false, message: "Tylko administrator może podpiąć stronę." };
  const parsed = z.object({ domain: z.string().trim().min(3).max(200) }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Podaj adres strony, np. brukcafe.pl." };
  let domain: string;
  try {
    const raw = parsed.data.domain;
    domain = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return { ok: false, message: "To nie wygląda na adres strony." };
  }

  const admin = getServiceClient();
  const mine = await admin.from("stats_websites").select("id").eq("tenant_id", session.tenantId).limit(1);
  if (mine.error) return { ok: false, message: "Tabela stron nie jest jeszcze gotowa (migracja stats_link)." };
  if ((mine.data ?? []).length > 0) return { ok: false, message: "Ten workspace ma już podpiętą stronę." };

  const unlinked = await admin
    .from("stats_websites")
    .select("id, domain")
    .is("tenant_id", null)
    .limit(200);
  const match = ((unlinked.data ?? []) as Array<{ id: string; domain: string | null }>).find(
    (row) => (row.domain ?? "").replace(/^www\./, "").toLowerCase() === domain,
  );
  const result = match
    ? await admin.from("stats_websites").update({ tenant_id: session.tenantId }).eq("id", match.id)
    : await admin.from("stats_websites").insert({ tenant_id: session.tenantId, name: session.tenantName, domain, user_id: null });
  if (result.error) return { ok: false, message: result.error.message };
  for (const path of ["/install", "/overview", "/traffic", "/conversions", "/bots"]) revalidatePath(path);
  return { ok: true, message: match ? "Strona podpięta. Dane z dotychczasowych pomiarów są już widoczne." : "Strona dodana. Wklej skrypt i wejdź na stronę." };
}
