import "server-only";

import { requireSession } from "@/lib/auth/session";
import { getUserClient } from "@/lib/supabase/server";

/**
 * Traffic analytics for the workspace's site, read through the signed-in
 * user's client. The site is the stats_websites row linked to the tenant;
 * its events and bot hits are visible to tenant members through RLS.
 * Everything is computed here, once, so every module page gets the same
 * numbers from one query set.
 */

export interface StatsSite {
  id: string;
  name: string;
  domain: string | null;
}

export interface StatsEvent {
  ts: string;
  path: string | null;
  title: string | null;
  source: string | null;
  ai_name: string | null;
  type: string | null;
  name: string | null;
  visitor: string | null;
  referrer?: string | null;
}

export interface BotHit {
  ts: string;
  bot: string | null;
  path: string | null;
}

export interface BarItem {
  label: string;
  value: number;
}

export interface TrendPoint {
  day: string;
  total: number;
  ai: number;
}

export interface StatsSnapshot {
  site: StatsSite | null;
  days: number;
  pageviews: number;
  uniques: number;
  fromAi: number;
  fromAiPct: number;
  conversions: number;
  trend: TrendPoint[];
  pages: BarItem[];
  assistants: BarItem[];
  channels: BarItem[];
  conversionsByKind: BarItem[];
  engagement: BarItem[];
  bots: Array<BarItem & { last: string | null }>;
  botHits: number;
}

const DAYS = 30;
const TREND_DAYS = 14;

const CHANNEL_LABEL: Record<string, string> = {
  ai: "AI",
  search: "Search engines",
  social: "Social",
  direct: "Direct",
  other: "Other",
};

const CONVERSION_LABEL: Record<string, string> = {
  phone: "Phone",
  directions: "Maps / directions",
  instagram: "Instagram",
  facebook: "Facebook",
  email: "Email",
  whatsapp: "WhatsApp",
  rezerwacja: "Reservation",
  menu: "Menu",
};

/** Section-reach events ("see_…") are engagement, not conversions. */
export function isEngagement(name: string | null): boolean {
  return /(^|_)(see|view|scroll|section)(_|$)/.test(name ?? "");
}

export function conversionLabel(name: string | null): string {
  if (name && CONVERSION_LABEL[name]) return CONVERSION_LABEL[name];
  const s = (name ?? "event").replace(/^main_/, "");
  if (/google_maps/.test(s)) return "Maps / directions (Google)";
  if (/apple_maps/.test(s)) return "Maps / directions (Apple)";
  if (/dojazd/.test(s)) return "Directions (button)";
  if (/^lang$/.test(s)) return "Language switch";
  if (/_cta$/.test(s)) return `${s.replace(/_cta$/, "").replace(/_/g, " ")} (CTA)`;
  return s.replace(/_/g, " ");
}

function engagementLabel(name: string | null): string {
  const s = (name ?? "").replace(/^main_/, "").replace(/^see_/, "").replace(/_/g, " ");
  return s || "section";
}

function groupBy<T>(rows: T[], key: (row: T) => string | null): BarItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    if (k == null) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export async function getStatsSite(): Promise<StatsSite | null> {
  const session = await requireSession();
  const supabase = await getUserClient();
  const result = await supabase
    .from("stats_websites")
    .select("id, name, domain")
    .eq("tenant_id", session.tenantId)
    .limit(1)
    .maybeSingle();
  if (result.error) return null;
  return (result.data as StatsSite | null) ?? null;
}

export async function getStatsSnapshot(): Promise<StatsSnapshot> {
  const site = await getStatsSite();
  const empty: StatsSnapshot = {
    site,
    days: DAYS,
    pageviews: 0,
    uniques: 0,
    fromAi: 0,
    fromAiPct: 0,
    conversions: 0,
    trend: [],
    pages: [],
    assistants: [],
    channels: [],
    conversionsByKind: [],
    engagement: [],
    bots: [],
    botHits: 0,
  };
  if (!site) return empty;

  const supabase = await getUserClient();
  const since = new Date(Date.now() - DAYS * 864e5).toISOString();
  const [eventsResult, botsResult] = await Promise.all([
    supabase
      .from("stats_events")
      .select("ts, path, title, source, ai_name, type, name, visitor")
      .eq("website_id", site.id)
      .gte("ts", since)
      .order("ts")
      .limit(8000),
    supabase
      .from("stats_bot_hits")
      .select("ts, bot, path")
      .eq("website_id", site.id)
      .gte("ts", since)
      .order("ts", { ascending: false })
      .limit(2000),
  ]);

  const all = (eventsResult.data ?? []) as StatsEvent[];
  const views = all.filter((e) => e.type !== "event");
  const events = all.filter((e) => e.type === "event");
  const conversions = events.filter((e) => !isEngagement(e.name));
  const engagements = events.filter((e) => isEngagement(e.name));

  const days = new Map<string, TrendPoint>();
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    days.set(day, { day, total: 0, ai: 0 });
  }
  const uniques = new Set<string>();
  let fromAi = 0;
  for (const view of views) {
    const isAi = view.source === "ai";
    if (isAi) fromAi += 1;
    if (view.visitor) uniques.add(view.visitor);
    const point = days.get(view.ts.slice(0, 10));
    if (point) {
      point.total += 1;
      if (isAi) point.ai += 1;
    }
  }

  const botRows = (botsResult.data ?? []) as BotHit[];
  const lastSeen = new Map<string, string>();
  for (const hit of botRows) {
    const key = hit.bot ?? "?";
    if (!lastSeen.has(key)) lastSeen.set(key, hit.ts);
  }

  return {
    site,
    days: DAYS,
    pageviews: views.length,
    uniques: uniques.size,
    fromAi,
    fromAiPct: views.length ? Math.round((fromAi / views.length) * 100) : 0,
    conversions: conversions.length,
    trend: [...days.values()],
    pages: groupBy(views, (v) => v.path || "/").slice(0, 8),
    assistants: groupBy(
      views.filter((v) => v.source === "ai"),
      (v) => v.ai_name || "AI",
    ),
    channels: groupBy(views, (v) => CHANNEL_LABEL[v.source ?? ""] ?? "Direct"),
    conversionsByKind: groupBy(conversions, (e) => conversionLabel(e.name)),
    engagement: groupBy(engagements, (e) => engagementLabel(e.name)),
    bots: groupBy(botRows, (h) => h.bot ?? "?").map((item) => ({
      ...item,
      last: lastSeen.get(item.label) ?? null,
    })),
    botHits: botRows.length,
  };
}
