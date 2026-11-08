import "server-only";

import { cache } from "react";

import { requireSession } from "@/lib/auth/session";
import { isSurvey } from "@/lib/survey-module"; // survey-module
import { fetchAll } from "@/lib/supabase/paginate";
import { getUserClient } from "@/lib/supabase/server";

/**
 * Traffic analytics for the workspace's site, read through the signed-in
 * user's client. The site is the stats_websites row linked to the tenant;
 * its events and bot hits are visible to tenant members through RLS.
 * Everything is computed here, once, so every module page gets the same
 * numbers from one query set.
 *
 * Windows. Every headline number covers the last DAYS days. The query
 * fetches twice that, so the same numbers can be computed for the DAYS days
 * before and shown as a change. Bot activity is kept per week for BOT_WEEKS
 * weeks, which fits inside the same fetch.
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

/** One conversion kind, split between AI visitors and everyone else. */
export interface SplitItem {
  label: string;
  ai: number;
  rest: number;
}

/** One assistant: visits in the window and visits per day, oldest first. */
export interface AssistantTrend {
  label: string;
  value: number;
  points: number[];
}

/** One crawler: hits in the window, hits per week (oldest first), last visit, favourite paths. */
export interface BotActivity {
  bot: string;
  total: number;
  last: string | null;
  weeks: number[];
  paths: BarItem[];
}

/**
 * Change against the DAYS days before the window. Counts are relative
 * (percent); the conversion rate is in percentage points. Null when the
 * previous window had nothing to compare with.
 */
export interface PeriodDeltas {
  pageviews: number | null;
  uniques: number | null;
  fromAi: number | null;
  conversions: number | null;
  conversionRate: number | null;
}

export interface StatsSnapshot {
  site: StatsSite | null;
  days: number;
  pageviews: number;
  uniques: number;
  fromAi: number;
  fromAiPct: number;
  conversions: number;
  /** Distinct visitors with at least one conversion in the window. */
  convertingVisitors: number;
  /** convertingVisitors / uniques, in percent with one decimal. */
  conversionRate: number;
  /** Visitors with at least one page view that came from an AI assistant. */
  aiVisitors: number;
  aiConverting: number;
  aiConversionRate: number;
  /** Everyone else. */
  restVisitors: number;
  restConverting: number;
  restConversionRate: number;
  delta: PeriodDeltas;
  trend: TrendPoint[];
  pages: BarItem[];
  assistants: BarItem[];
  assistantTrends: AssistantTrend[];
  /** Pages that AI assistants link people to, by visits. */
  aiLanding: BarItem[];
  channels: BarItem[];
  conversionsByKind: BarItem[];
  conversionsSplit: SplitItem[];
  engagement: BarItem[];
  bots: Array<BarItem & { last: string | null }>;
  botHits: number;
  botWeeks: number;
  botActivity: BotActivity[];
  /** Set when a query failed. The numbers above are then partial or empty. */
  error: string | null;
  /** True when the fetch hit its row ceiling and the oldest days are missing. */
  truncated: boolean;
}

const DAYS = 30;
const TREND_DAYS = DAYS;
const BOT_WEEKS = 8;
const FETCH_DAYS = DAYS * 2;
const DAY_MS = 864e5;
const WEEK_MS = 7 * DAY_MS;
// Twice the window means twice the rows; the ceiling moves with it so that a
// busy site keeps the same days per request as before.
const MAX_EVENT_ROWS = 40_000;

/** Assistants the collector recognises in referrers. Order is the order shown. */
export const KNOWN_ASSISTANTS = ["ChatGPT", "Perplexity", "Gemini", "Claude", "Copilot"];

/** The crawlers that matter, and the assistant each one feeds. */
export const KEY_BOTS: Array<{ bot: string; assistant: string }> = [
  { bot: "GPTBot", assistant: "ChatGPT" },
  { bot: "OAI-SearchBot", assistant: "ChatGPT search" },
  { bot: "PerplexityBot", assistant: "Perplexity" },
  { bot: "ClaudeBot", assistant: "Claude" },
  // Gemini and AI Overviews read through Googlebot, which the crawler hook
  // does not report; "Google-Extended" is an opt-out token, not a visitor.
];

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
  if (/google[-_]?review|opinia|review/.test(s)) return "Google review";
  if (/tripadvisor/.test(s)) return "Tripadvisor";
  if (/instagram/.test(s)) return "Instagram";
  if (/facebook/.test(s)) return "Facebook";
  if (/_cta$/.test(s)) return `${s.replace(/_cta$/, "").replace(/[_-]/g, " ")} (CTA)`;
  const plain = s.replace(/[_-]/g, " ");
  return plain.charAt(0).toUpperCase() + plain.slice(1);
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

/** Share in percent with one decimal; 0 when there is nothing to divide by. */
function rate(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}

/** Relative change in whole percent; null when the previous value was 0. */
function change(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

interface Summary {
  views: StatsEvent[];
  conversions: StatsEvent[];
  engagements: StatsEvent[];
  visitors: Set<string>;
  aiVisitors: Set<string>;
  converting: Set<string>;
  fromAi: number;
}

/**
 * One pass over a window of rows. A visitor is "from AI" when at least one
 * of their page views in the window came from an assistant; event rows carry
 * no source of their own, so this is the only way to attribute a conversion
 * to a channel.
 */
function summarize(rows: StatsEvent[]): Summary {
  const views: StatsEvent[] = [];
  const conversions: StatsEvent[] = [];
  const engagements: StatsEvent[] = [];
  const visitors = new Set<string>();
  const aiVisitors = new Set<string>();
  const converting = new Set<string>();
  let fromAi = 0;
  for (const row of rows) {
    if (row.type === "event") {
      if (isSurvey(row.name)) continue; // survey-module
      if (isEngagement(row.name)) {
        engagements.push(row);
        continue;
      }
      conversions.push(row);
      if (row.visitor) converting.add(row.visitor);
      continue;
    }
    views.push(row);
    if (row.visitor) visitors.add(row.visitor);
    if (row.source === "ai") {
      fromAi += 1;
      if (row.visitor) aiVisitors.add(row.visitor);
    }
  }
  return { views, conversions, engagements, visitors, aiVisitors, converting, fromAi };
}

/** Converting visitors who also have a page view in the window, so the rate stays within 0 and 100. */
function convertingAmong(summary: Summary, group: (visitor: string) => boolean): number {
  let n = 0;
  for (const visitor of summary.converting) {
    if (summary.visitors.has(visitor) && group(visitor)) n += 1;
  }
  return n;
}

const getStatsSiteResult = cache(async function getStatsSiteResult(): Promise<{
  site: StatsSite | null;
  error: string | null;
}> {
  const session = await requireSession();
  const supabase = await getUserClient();
  const result = await supabase
    .from("stats_websites")
    .select("id, name, domain")
    .eq("tenant_id", session.tenantId)
    .limit(1)
    .maybeSingle();
  if (result.error) return { site: null, error: result.error.message };
  return { site: (result.data as StatsSite | null) ?? null, error: null };
});

export const getStatsSite = cache(async function getStatsSite(): Promise<StatsSite | null> {
  return (await getStatsSiteResult()).site;
});

export async function getStatsSnapshot(): Promise<StatsSnapshot> {
  const { site, error: siteError } = await getStatsSiteResult();
  const empty: StatsSnapshot = {
    site,
    days: DAYS,
    pageviews: 0,
    uniques: 0,
    fromAi: 0,
    fromAiPct: 0,
    conversions: 0,
    convertingVisitors: 0,
    conversionRate: 0,
    aiVisitors: 0,
    aiConverting: 0,
    aiConversionRate: 0,
    restVisitors: 0,
    restConverting: 0,
    restConversionRate: 0,
    delta: { pageviews: null, uniques: null, fromAi: null, conversions: null, conversionRate: null },
    trend: [],
    pages: [],
    assistants: [],
    assistantTrends: [],
    aiLanding: [],
    channels: [],
    conversionsByKind: [],
    conversionsSplit: [],
    engagement: [],
    bots: [],
    botHits: 0,
    botWeeks: BOT_WEEKS,
    botActivity: [],
    error: siteError ? `Could not load the website record: ${siteError}` : null,
    truncated: false,
  };
  if (!site) return empty;

  const supabase = await getUserClient();
  const now = Date.now();
  const since = new Date(now - FETCH_DAYS * DAY_MS).toISOString();
  const windowStart = now - DAYS * DAY_MS;
  // Paged: a busy site has far more than the 1000 rows one request returns,
  // and newest-first so that a truncated set would lose old days, not today.
  const [eventsResult, botsResult] = await Promise.all([
    fetchAll<StatsEvent>(
      () =>
        supabase
          .from("stats_events")
          .select("ts, path, title, source, ai_name, type, name, visitor", { count: "exact" })
          .eq("website_id", site.id)
          .gte("ts", since)
          .order("ts", { ascending: false }),
      { max: MAX_EVENT_ROWS },
    ),
    fetchAll<BotHit>(() =>
      supabase
        .from("stats_bot_hits")
        .select("ts, bot, path", { count: "exact" })
        .eq("website_id", site.id)
        .gte("ts", since)
        .order("ts", { ascending: false }),
    ),
  ]);

  const problems: string[] = [];
  if (eventsResult.error) problems.push(`visits (${eventsResult.error.message})`);
  if (botsResult.error) problems.push(`crawler visits (${botsResult.error.message})`);
  const error = problems.length ? `Could not load ${problems.join(" and ")}.` : null;

  const currentRows: StatsEvent[] = [];
  const previousRows: StatsEvent[] = [];
  for (const row of eventsResult.rows) {
    (Date.parse(row.ts) >= windowStart ? currentRows : previousRows).push(row);
  }
  const cur = summarize(currentRows);
  const prev = summarize(previousRows);

  // Calendar days of the window, oldest first, for the trend and the sparklines.
  const dayKeys: string[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    dayKeys.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10));
  }
  const dayIndex = new Map(dayKeys.map((day, i) => [day, i]));
  const trend: TrendPoint[] = dayKeys.map((day) => ({ day, total: 0, ai: 0 }));
  const perAssistant = new Map<string, number[]>();
  for (const view of cur.views) {
    const i = dayIndex.get(view.ts.slice(0, 10));
    if (i === undefined) continue;
    trend[i].total += 1;
    if (view.source === "ai") {
      trend[i].ai += 1;
      const name = view.ai_name || "AI";
      let points = perAssistant.get(name);
      if (!points) {
        points = new Array<number>(TREND_DAYS).fill(0);
        perAssistant.set(name, points);
      }
      points[i] += 1;
    }
  }

  const aiViews = cur.views.filter((v) => v.source === "ai");
  const assistants = groupBy(aiViews, (v) => v.ai_name || "AI");

  // Conversions by kind, each split by whether the visitor came from AI.
  const split = new Map<string, SplitItem>();
  for (const event of cur.conversions) {
    const label = conversionLabel(event.name);
    const item = split.get(label) ?? { label, ai: 0, rest: 0 };
    if (event.visitor && cur.aiVisitors.has(event.visitor)) item.ai += 1;
    else item.rest += 1;
    split.set(label, item);
  }

  const convertingVisitors = convertingAmong(cur, () => true);
  const aiConverting = convertingAmong(cur, (v) => cur.aiVisitors.has(v));
  const restConverting = convertingVisitors - aiConverting;
  const aiVisitors = cur.aiVisitors.size;
  const restVisitors = cur.visitors.size - aiVisitors;
  const conversionRate = rate(convertingVisitors, cur.visitors.size);
  const prevConversionRate = rate(convertingAmong(prev, () => true), prev.visitors.size);

  // Crawlers: the last-30-days list as before, plus eight weeks of activity.
  const botRows = botsResult.rows;
  const botsCurrent = botRows.filter((h) => Date.parse(h.ts) >= windowStart);
  const lastSeen = new Map<string, string>();
  const weekly = new Map<string, number[]>();
  const pathsByBot = new Map<string, BotHit[]>();
  for (const hit of botRows) {
    const key = hit.bot ?? "?";
    if (!lastSeen.has(key)) lastSeen.set(key, hit.ts);
    const week = Math.floor((now - Date.parse(hit.ts)) / WEEK_MS);
    if (week < 0 || week >= BOT_WEEKS) continue;
    let weeks = weekly.get(key);
    if (!weeks) {
      weeks = new Array<number>(BOT_WEEKS).fill(0);
      weekly.set(key, weeks);
    }
    weeks[BOT_WEEKS - 1 - week] += 1;
    const list = pathsByBot.get(key) ?? [];
    list.push(hit);
    pathsByBot.set(key, list);
  }
  const bots = groupBy(botsCurrent, (h) => h.bot ?? "?").map((item) => ({
    ...item,
    last: lastSeen.get(item.label) ?? null,
  }));
  const currentByBot = new Map(bots.map((b) => [b.label, b.value]));
  const botActivity: BotActivity[] = [...weekly.entries()]
    .map(([bot, weeks]) => ({
      bot,
      total: currentByBot.get(bot) ?? 0,
      last: lastSeen.get(bot) ?? null,
      weeks,
      paths: groupBy(pathsByBot.get(bot) ?? [], (h) => h.path || "/").slice(0, 3),
    }))
    .sort((a, b) => b.total - a.total || sum(b.weeks) - sum(a.weeks));

  return {
    site,
    days: DAYS,
    pageviews: cur.views.length,
    uniques: cur.visitors.size,
    fromAi: cur.fromAi,
    fromAiPct: cur.views.length ? Math.round((cur.fromAi / cur.views.length) * 100) : 0,
    conversions: cur.conversions.length,
    convertingVisitors,
    conversionRate,
    aiVisitors,
    aiConverting,
    aiConversionRate: rate(aiConverting, aiVisitors),
    restVisitors,
    restConverting,
    restConversionRate: rate(restConverting, restVisitors),
    delta: {
      pageviews: change(cur.views.length, prev.views.length),
      uniques: change(cur.visitors.size, prev.visitors.size),
      fromAi: change(cur.fromAi, prev.fromAi),
      conversions: change(cur.conversions.length, prev.conversions.length),
      conversionRate: prev.visitors.size ? Math.round((conversionRate - prevConversionRate) * 10) / 10 : null,
    },
    trend,
    pages: groupBy(cur.views, (v) => v.path || "/").slice(0, 8),
    assistants,
    assistantTrends: assistants.map((a) => ({
      label: a.label,
      value: a.value,
      points: perAssistant.get(a.label) ?? new Array<number>(TREND_DAYS).fill(0),
    })),
    aiLanding: groupBy(aiViews, (v) => v.path || "/").slice(0, 8),
    channels: groupBy(cur.views, (v) => CHANNEL_LABEL[v.source ?? ""] ?? CHANNEL_LABEL.other),
    conversionsByKind: groupBy(cur.conversions, (e) => conversionLabel(e.name)),
    conversionsSplit: [...split.values()].sort((a, b) => b.ai + b.rest - (a.ai + a.rest)),
    engagement: groupBy(cur.engagements, (e) => engagementLabel(e.name)),
    bots,
    botHits: botsCurrent.length,
    botWeeks: BOT_WEEKS,
    botActivity,
    error,
    truncated: eventsResult.truncated || botsResult.truncated,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
