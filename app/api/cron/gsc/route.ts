import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { gscConfigured } from "@/lib/google/search-console";
import { getServiceClient } from "@/lib/supabase/server";
import { syncSearchConsole } from "@/services/gsc";

/**
 * Daily Search Console sync: every connected property gets its new days
 * pulled into gsc_daily. Google finalises a day about two days later, so
 * each run re-reads the last two synced days as well.
 */

export const maxDuration = 300;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret") ??
    "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!gscConfigured()) {
    return NextResponse.json({ error: "No Search Console service account configured (GSC_SERVICE_ACCOUNT_JSON)." }, { status: 503 });
  }
  const service = getServiceClient();
  const properties = await service.from("gsc_properties").select("tenant_id, site_url, last_synced_on");
  if (properties.error) {
    return NextResponse.json(
      { error: "Search Console tables are missing", detail: properties.error.message, hint: "Apply supabase/migrations/20261109120000_analyst_and_gsc.sql" },
      { status: 503 },
    );
  }
  const results: Array<Record<string, unknown>> = [];
  for (const row of (properties.data ?? []) as Array<{ tenant_id: string; site_url: string; last_synced_on: string | null }>) {
    try {
      const synced = await syncSearchConsole(service, row.tenant_id, row.site_url, row.last_synced_on);
      results.push({ tenant: row.tenant_id, site: row.site_url, ...synced });
    } catch (error) {
      results.push({ tenant: row.tenant_id, site: row.site_url, error: (error as Error).message.slice(0, 300) });
    }
  }
  return NextResponse.json({ properties: results.length, results });
}
