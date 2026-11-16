import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { searchAnalytics } from "@/lib/google/search-console";
import { fetchAll } from "@/lib/supabase/paginate";
import type { DemandByIntent } from "@/services/visibility";

/**
 * Google Search Console next to the AI answers: what people type into
 * Google, grouped under the same question types the battery uses, so a type
 * with real demand and no AI presence rises to the top of the plan.
 *
 * Rows are synced daily into gsc_daily by the cron; reads aggregate the last
 * DEMAND_DAYS days. Queries are matched to question types by shared words,
 * with words common to most types (the city, "cafe") ignored. A heuristic on
 * purpose: it needs no configuration and is right often enough to rank
 * types; a model-assisted mapping table can refine it later.
 */

export const DEMAND_DAYS = 28;
/** Search Console publishes final numbers with a lag of about two days. */
const FINALITY_LAG_DAYS = 2;
const FIRST_SYNC_DAYS = 90;

export interface GscQuery {
  query: string;
  impressions: number;
  clicks: number;
  /** Impressions-weighted average position. */
  position: number | null;
}

export interface GscSnapshot {
  configured: boolean;
  connected: boolean;
  siteUrl: string | null;
  lastSyncedOn: string | null;
  lastError: string | null;
  days: number;
  impressions: number;
  clicks: number;
  topQueries: GscQuery[];
  /** Queries with impressions that matched no question type, by impressions. */
  unmapped: GscQuery[];
  demand: DemandByIntent;
  error: string | null;
}

interface PropertyRow {
  tenant_id: string;
  site_url: string;
  last_synced_on: string | null;
  last_error: string | null;
}

interface DailyRow {
  query: string;
  clicks: number;
  impressions: number;
  position: number | null;
}

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l");
}

function wordsOf(text: string): string[] {
  return fold(text).split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
}

/** A light stem for Polish and English endings, so "matchy" meets "matcha" and "cafes" meets "cafe". */
function stem(word: string): string {
  return word.replace(/(ami|ach|owi|iem|em|om|ie|ia|ię|ą|ę|y|i|a|e|u|o|s)$/u, "");
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
}

/**
 * Assigns each query to the question type it shares the most specific words
 * with. Words present in half or more of the types carry no information
 * (the city, the category) and are ignored.
 */
export function mapQueriesToIntents(
  queries: GscQuery[],
  intents: Array<{ name: string; questions: string[] }>,
): { demand: DemandByIntent; unmapped: GscQuery[] } {
  const intentTokens = intents.map((intent) => {
    const set = new Set<string>();
    for (const text of [intent.name, ...intent.questions]) for (const word of wordsOf(text)) set.add(stem(word));
    return { name: intent.name, tokens: set };
  });
  const frequency = new Map<string, number>();
  for (const intent of intentTokens) for (const token of intent.tokens) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  const generic = new Set([...frequency.entries()].filter(([, n]) => n >= Math.max(2, Math.ceil(intentTokens.length / 2))).map(([t]) => t));

  const demand: DemandByIntent = {};
  const unmapped: GscQuery[] = [];
  for (const q of queries) {
    const tokens = new Set(wordsOf(q.query).map(stem).filter((t) => !generic.has(t)));
    let best: { name: string; score: number } | null = null;
    for (const intent of intentTokens) {
      let score = 0;
      for (const token of tokens) if (intent.tokens.has(token)) score += 1;
      if (score > 0 && (!best || score > best.score)) best = { name: intent.name, score };
    }
    if (!best) {
      unmapped.push(q);
      continue;
    }
    const entry = demand[best.name] ?? { impressions: 0, clicks: 0, queries: 0, top: [] };
    entry.impressions += q.impressions;
    entry.clicks += q.clicks;
    entry.queries += 1;
    if (entry.top.length < 3) entry.top.push(q.query);
    demand[best.name] = entry;
  }
  unmapped.sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query));
  return { demand, unmapped: unmapped.slice(0, 10) };
}

/** Pulls new days for one property into gsc_daily and records the sync. */
export async function syncSearchConsole(
  service: SupabaseClient,
  tenantId: string,
  siteUrl: string,
  lastSyncedOn: string | null,
): Promise<{ rows: number; from: string; to: string }> {
  const to = isoDaysAgo(FINALITY_LAG_DAYS);
  // Re-read the last two synced days: Google revises them once more.
  const from = lastSyncedOn
    ? new Date(Math.min(Date.parse(lastSyncedOn) - FINALITY_LAG_DAYS * 864e5, Date.parse(to))).toISOString().slice(0, 10)
    : isoDaysAgo(FIRST_SYNC_DAYS);
  try {
    const rows = await searchAnalytics(siteUrl, from, to);
    for (let i = 0; i < rows.length; i += 1000) {
      const chunk = rows.slice(i, i + 1000).map((r) => ({
        tenant_id: tenantId,
        day: r.day,
        query: r.query.slice(0, 500),
        page: r.page.slice(0, 1000),
        clicks: r.clicks,
        impressions: r.impressions,
        position: Math.round(r.position * 100) / 100,
      }));
      const upsert = await service.from("gsc_daily").upsert(chunk, { onConflict: "tenant_id,day,query,page" });
      if (upsert.error) throw new Error(upsert.error.message);
    }
    await service.from("gsc_properties").update({ last_synced_on: to, last_error: null }).eq("tenant_id", tenantId);
    return { rows: rows.length, from, to };
  } catch (error) {
    await service.from("gsc_properties").update({ last_error: (error as Error).message.slice(0, 500) }).eq("tenant_id", tenantId);
    throw error;
  }
}

/** The battery as the mapping needs it: type name plus its questions. */
async function loadIntentQuestions(supabase: SupabaseClient, tenantId: string): Promise<Array<{ name: string; questions: string[] }>> {
  const result = await supabase
    .from("visibility_prompts")
    .select("text, intents(name, is_branded)")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .limit(1000);
  const byIntent = new Map<string, string[]>();
  for (const row of (result.data ?? []) as unknown as Array<{ text: string; intents: { name: string; is_branded: boolean } | null }>) {
    if (!row.intents || row.intents.is_branded) continue;
    byIntent.set(row.intents.name, [...(byIntent.get(row.intents.name) ?? []), row.text]);
  }
  return [...byIntent.entries()].map(([name, questions]) => ({ name, questions }));
}

/** Search Console as the panel reads it for one workspace. */
export async function loadGscSnapshot(supabase: SupabaseClient, tenantId: string, configured: boolean): Promise<GscSnapshot> {
  const empty: GscSnapshot = {
    configured,
    connected: false,
    siteUrl: null,
    lastSyncedOn: null,
    lastError: null,
    days: DEMAND_DAYS,
    impressions: 0,
    clicks: 0,
    topQueries: [],
    unmapped: [],
    demand: {},
    error: null,
  };
  const property = await supabase
    .from("gsc_properties")
    .select("tenant_id, site_url, last_synced_on, last_error")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (property.error) {
    // A missing table reads as "not connected", not as a broken page.
    return /does not exist|schema cache/i.test(property.error.message) ? empty : { ...empty, error: property.error.message };
  }
  const row = property.data as PropertyRow | null;
  if (!row) return empty;

  const since = isoDaysAgo(DEMAND_DAYS + FINALITY_LAG_DAYS);
  const [daily, intents] = await Promise.all([
    fetchAll<DailyRow>(() =>
      supabase
        .from("gsc_daily")
        .select("query, clicks, impressions, position", { count: "exact" })
        .eq("tenant_id", tenantId)
        .gte("day", since)
        .order("day", { ascending: false })
        .order("query"),
    ),
    loadIntentQuestions(supabase, tenantId),
  ]);
  if (daily.error) return { ...empty, connected: true, siteUrl: row.site_url, lastSyncedOn: row.last_synced_on, lastError: row.last_error, error: daily.error.message };

  const byQuery = new Map<string, { impressions: number; clicks: number; posSum: number }>();
  for (const r of daily.rows) {
    const entry = byQuery.get(r.query) ?? { impressions: 0, clicks: 0, posSum: 0 };
    entry.impressions += r.impressions;
    entry.clicks += r.clicks;
    entry.posSum += (r.position ?? 0) * r.impressions;
    byQuery.set(r.query, entry);
  }
  const queries: GscQuery[] = [...byQuery.entries()]
    .map(([query, e]) => ({ query, impressions: e.impressions, clicks: e.clicks, position: e.impressions ? Math.round((e.posSum / e.impressions) * 10) / 10 : null }))
    .sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query));
  const { demand, unmapped } = mapQueriesToIntents(queries, intents);

  return {
    configured,
    connected: true,
    siteUrl: row.site_url,
    lastSyncedOn: row.last_synced_on,
    lastError: row.last_error,
    days: DEMAND_DAYS,
    impressions: queries.reduce((sum, q) => sum + q.impressions, 0),
    clicks: queries.reduce((sum, q) => sum + q.clicks, 0),
    topQueries: queries.slice(0, 12),
    unmapped,
    demand,
    error: null,
  };
}
