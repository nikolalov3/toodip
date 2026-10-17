import "server-only";

import { requireSession } from "@/lib/auth/session";
import { getUserClient } from "@/lib/supabase/server";
import { classifyDomain, periodLabel, periodOf, periodStart, type Platform, type SourceCategory } from "@/services/visibility";

/**
 * Share of voice, in depth. Everything here is counted from the runs ledger
 * (one row per question asked once), never estimated:
 *
 *  - who is named how often, over time and per segment (question type,
 *    platform, language);
 *  - where in the answer the venue appears, not just whether;
 *  - how stable each question is across repetitions;
 *  - head-to-head against any rival: the questions they win, the sources
 *    behind them.
 *
 * Branded questions (the venue's own name in the question) are excluded
 * throughout, as in the headline score.
 */

export interface BrandShare {
  name: string;
  isOwn: boolean;
  /** Runs in which the brand is named. */
  runs: number;
  /** runs / category runs, 0..1 */
  share: number;
  /** Average 1-based position when named. */
  avgPosition: number | null;
}

export interface ShareTimelinePoint {
  date: string;
  label: string;
  runs: number;
  /** brand name -> share that day, 0..1 */
  shares: Record<string, number>;
}

export interface IntentShare {
  intent: string;
  language: string;
  runs: number;
  ownRuns: number;
  ownShare: number;
  /** Rank of the venue among brands named for this intent, null when absent. */
  ownRank: number | null;
  leader: { name: string; share: number } | null;
  brands: number;
}

export interface SegmentShare {
  key: string;
  label: string;
  runs: number;
  ownRuns: number;
  ownShare: number;
  ownRank: number | null;
  brands: number;
}

export interface PositionSplit {
  first: number;
  second: number;
  third: number;
  later: number;
  absent: number;
  runs: number;
}

export interface PromptStability {
  text: string;
  intent: string;
  runs: number;
  ownRuns: number;
  status: "reliable" | "flicker" | "absent" | "single";
}

export interface HeadToHead {
  rival: string;
  rivalRuns: number;
  ownRuns: number;
  /** Intents where the rival is named and the venue is not. */
  rivalOnly: Array<{ intent: string; rivalRuns: number; runs: number }>;
  bothPresent: Array<{ intent: string; rivalRuns: number; ownRuns: number; runs: number }>;
  ownOnly: Array<{ intent: string; ownRuns: number; runs: number }>;
  /** Domains cited in answers naming the rival, by count. */
  rivalSources: Array<{ domain: string; category: SourceCategory; count: number }>;
  ownSources: Array<{ domain: string; category: SourceCategory; count: number }>;
}

export interface ShareDetail {
  hasData: boolean;
  venueName: string;
  /** Own mentions / all brand mentions in the latest measurement, 0..1. */
  shareOfVoice: number;
  categoryRuns: number;
  dates: string[];
  latestDate: string | null;
  latestLabel: string | null;
  latestRuns: number;
  brands: BrandShare[];
  timeline: ShareTimelinePoint[];
  timelineBrands: string[];
  byIntent: IntentShare[];
  byPlatform: SegmentShare[];
  byLanguage: SegmentShare[];
  positions: PositionSplit;
  stability: PromptStability[];
  stabilitySummary: { reliable: number; flicker: number; absent: number; single: number };
  rivals: string[];
  headToHead: HeadToHead | null;
}

interface RunRow {
  id: string;
  platform: Platform;
  executed_on: string;
  source: string;
  visibility_prompts: {
    text: string;
    language: string;
    intents: { name: string; language: string; is_branded: boolean } | null;
  } | null;
  visibility_mentions: Array<{ name: string; is_own: boolean; position: number | null }>;
  visibility_citations: Array<{ domain: string }>;
}

const PLATFORM_LABEL: Record<Platform, string> = {
  chatgpt: "ChatGPT",
  google_aio: "Google AI Overviews",
  perplexity: "Perplexity",
  other: "Other",
};

const LANGUAGE_LABEL: Record<string, string> = { pl: "Polish", en: "English", de: "German" };

function key(name: string): string {
  return name.toLowerCase().trim();
}

const OWN_KEY = "__own__";

/**
 * One entry per brand per run, first position wins. Every mention flagged as
 * the venue itself ("Café Belmont", "Belmont Cafe") folds into one own entry,
 * so the venue is never split across spellings the way a rival might be.
 */
function brandsInRun(run: RunRow): Map<string, { display: string; isOwn: boolean; position: number | null }> {
  const map = new Map<string, { display: string; isOwn: boolean; position: number | null }>();
  for (const m of run.visibility_mentions) {
    const k = m.is_own ? OWN_KEY : key(m.name);
    if (!k) continue;
    const existing = map.get(k);
    if (existing) {
      if (m.position && (!existing.position || m.position < existing.position)) existing.position = m.position;
      continue;
    }
    map.set(k, { display: m.name, isOwn: m.is_own, position: m.position });
  }
  return map;
}

function segment(
  runs: RunRow[],
  groupKey: (run: RunRow) => string,
  label: (k: string) => string,
): SegmentShare[] {
  const groups = new Map<string, RunRow[]>();
  for (const run of runs) {
    const k = groupKey(run);
    groups.set(k, [...(groups.get(k) ?? []), run]);
  }
  return [...groups.entries()]
    .map(([k, rows]) => {
      const counts = new Map<string, { own: boolean; n: number }>();
      let ownRuns = 0;
      for (const run of rows) {
        const brands = brandsInRun(run);
        let ownHere = false;
        for (const [bk, b] of brands) {
          const e = counts.get(bk) ?? { own: b.isOwn, n: 0 };
          e.n += 1;
          counts.set(bk, e);
          if (b.isOwn) ownHere = true;
        }
        if (ownHere) ownRuns += 1;
      }
      const ranked = [...counts.values()].sort((a, b) => b.n - a.n);
      const ownIndex = ranked.findIndex((e) => e.own);
      return {
        key: k,
        label: label(k),
        runs: rows.length,
        ownRuns,
        ownShare: rows.length ? ownRuns / rows.length : 0,
        ownRank: ownIndex >= 0 ? ownIndex + 1 : null,
        brands: ranked.length,
      };
    })
    .sort((a, b) => b.runs - a.runs);
}

export async function getShareDetail(rivalParam?: string): Promise<ShareDetail> {
  const session = await requireSession();
  const supabase = await getUserClient();

  const [runsResult, profileResult] = await Promise.all([
    supabase
      .from("visibility_runs")
      .select(
        "id, platform, executed_on, source, visibility_prompts(text, language, intents(name, language, is_branded)), visibility_mentions(name, is_own, position), visibility_citations(domain)",
      )
      .eq("tenant_id", session.tenantId)
      .order("executed_on", { ascending: true })
      .limit(5000),
    supabase.from("business_profiles").select("name").eq("tenant_id", session.tenantId).maybeSingle(),
  ]);

  const venueName = (profileResult.data as { name: string } | null)?.name ?? session.tenantName;
  const displayName = (name: string, isOwn: boolean) => (isOwn ? venueName : name);
  const all = (runsResult.data ?? []) as unknown as RunRow[];
  let runs = all.filter((run) => !run.visibility_prompts?.intents?.is_branded);

  const empty: ShareDetail = {
    hasData: false,
    venueName,
    shareOfVoice: 0,
    categoryRuns: 0,
    dates: [],
    latestDate: null,
    latestLabel: null,
    latestRuns: 0,
    brands: [],
    timeline: [],
    timelineBrands: [],
    byIntent: [],
    byPlatform: [],
    byLanguage: [],
    positions: { first: 0, second: 0, third: 0, later: 0, absent: 0, runs: 0 },
    stability: [],
    stabilitySummary: { reliable: 0, flicker: 0, absent: 0, single: 0 },
    rivals: [],
    headToHead: null,
  };
  if (runs.length === 0) return empty;

  const allRuns = runs;
  const periods = [...new Set(allRuns.map(periodOf))].sort((a, b) => periodStart(a).localeCompare(periodStart(b)));
  const latestPeriod = periods[periods.length - 1];
  const dates = periods.map(periodStart);
  const latestDate = periodStart(latestPeriod);
  // Brands, segments, positions and stability describe the latest measurement
  // (one monthly report counts as one measurement). The trend and head to head
  // use the whole history.
  runs = allRuns.filter((r) => periodOf(r) === latestPeriod);

  // ── Brands in the latest measurement ─────────────────────────────────────
  const brandTotals = new Map<string, { display: string; isOwn: boolean; runs: number; posSum: number; posN: number }>();
  for (const run of runs) {
    for (const [k, b] of brandsInRun(run)) {
      const e = brandTotals.get(k) ?? { display: b.display, isOwn: b.isOwn, runs: 0, posSum: 0, posN: 0 };
      e.runs += 1;
      if (b.position) {
        e.posSum += b.position;
        e.posN += 1;
      }
      if (b.isOwn) e.isOwn = true;
      brandTotals.set(k, e);
    }
  }
  const brands: BrandShare[] = [...brandTotals.values()]
    .map((e) => ({
      name: displayName(e.display, e.isOwn),
      isOwn: e.isOwn,
      runs: e.runs,
      share: e.runs / runs.length,
      avgPosition: e.posN ? Math.round((e.posSum / e.posN) * 10) / 10 : null,
    }))
    // Same tie-break as the overview leaderboard, so the two ranks agree.
    .sort((a, b) => b.runs - a.runs || a.name.localeCompare(b.name));

  const totalBrandRuns = brands.reduce((sum, b) => sum + b.runs, 0);
  const own = brands.find((b) => b.isOwn);
  const shareOfVoice = own && totalBrandRuns ? own.runs / totalBrandRuns : 0;
  /** Lookup key for a brand name in brandsInRun(): the venue lives under OWN_KEY. */
  const lookupKey = (name: string) => (own && name === own.name ? OWN_KEY : key(name));

  // ── Timeline: top brands + own, per measurement ───────────────────────────
  const timelineBrands = [
    ...brands.filter((b) => !b.isOwn).slice(0, 5).map((b) => b.name),
    ...(own ? [own.name] : []),
  ];
  const timeline: ShareTimelinePoint[] = periods.map((period) => {
    const dayRuns = allRuns.filter((r) => periodOf(r) === period);
    const shares: Record<string, number> = {};
    for (const name of timelineBrands) {
      const k = lookupKey(name);
      const n = dayRuns.filter((r) => brandsInRun(r).has(k)).length;
      shares[name] = dayRuns.length ? n / dayRuns.length : 0;
    }
    return { date: periodStart(period), label: periodLabel(period), runs: dayRuns.length, shares };
  });

  // ── Per intent ─────────────────────────────────────────────────────────────
  const intentGroups = new Map<string, RunRow[]>();
  for (const run of runs) {
    const name = run.visibility_prompts?.intents?.name ?? "unknown";
    intentGroups.set(name, [...(intentGroups.get(name) ?? []), run]);
  }
  const byIntent: IntentShare[] = [...intentGroups.entries()]
    .map(([intent, rows]) => {
      const counts = new Map<string, { display: string; own: boolean; n: number }>();
      let ownRuns = 0;
      for (const run of rows) {
        const bs = brandsInRun(run);
        let ownHere = false;
        for (const [bk, b] of bs) {
          const e = counts.get(bk) ?? { display: b.display, own: b.isOwn, n: 0 };
          e.n += 1;
          counts.set(bk, e);
          if (b.isOwn) ownHere = true;
        }
        if (ownHere) ownRuns += 1;
      }
      const ranked = [...counts.values()].sort((a, b) => b.n - a.n);
      const ownIndex = ranked.findIndex((e) => e.own);
      const leader = ranked.find((e) => !e.own) ?? null;
      return {
        intent,
        language: rows[0]?.visibility_prompts?.intents?.language ?? rows[0]?.visibility_prompts?.language ?? "pl",
        runs: rows.length,
        ownRuns,
        ownShare: rows.length ? ownRuns / rows.length : 0,
        ownRank: ownIndex >= 0 ? ownIndex + 1 : null,
        leader: leader ? { name: leader.display, share: leader.n / rows.length } : null,
        brands: ranked.length,
      };
    })
    .sort((a, b) => b.ownShare - a.ownShare || b.runs - a.runs);

  // ── Per platform and language ──────────────────────────────────────────────
  const byPlatform = segment(runs, (r) => r.platform, (k) => PLATFORM_LABEL[k as Platform] ?? k);
  const byLanguage = segment(
    runs,
    (r) => (r.visibility_prompts?.language ?? "pl").slice(0, 2).toLowerCase(),
    (k) => LANGUAGE_LABEL[k] ?? k.toUpperCase(),
  );

  // ── Position of the venue when named (latest measurement day) ─────────────
  const latestRuns = runs;
  const positions: PositionSplit = { first: 0, second: 0, third: 0, later: 0, absent: 0, runs: latestRuns.length };
  for (const run of latestRuns) {
    const ownMention = [...brandsInRun(run).values()].find((b) => b.isOwn);
    if (!ownMention) {
      positions.absent += 1;
      continue;
    }
    const p = ownMention.position ?? 99;
    if (p === 1) positions.first += 1;
    else if (p === 2) positions.second += 1;
    else if (p === 3) positions.third += 1;
    else positions.later += 1;
  }

  // ── Stability per question (latest day, across repetitions) ───────────────
  const promptGroups = new Map<string, { intent: string; runs: number; own: number }>();
  for (const run of latestRuns) {
    const text = run.visibility_prompts?.text ?? "?";
    const e = promptGroups.get(text) ?? { intent: run.visibility_prompts?.intents?.name ?? "unknown", runs: 0, own: 0 };
    e.runs += 1;
    if ([...brandsInRun(run).values()].some((b) => b.isOwn)) e.own += 1;
    promptGroups.set(text, e);
  }
  const stability: PromptStability[] = [...promptGroups.entries()]
    .map(([text, e]) => ({
      text,
      intent: e.intent,
      runs: e.runs,
      ownRuns: e.own,
      status:
        e.runs < 2 ? ("single" as const)
        : e.own === 0 ? ("absent" as const)
        : e.own === e.runs ? ("reliable" as const)
        : ("flicker" as const),
    }))
    .sort((a, b) => b.ownRuns / b.runs - a.ownRuns / a.runs || a.text.localeCompare(b.text));
  const stabilitySummary = {
    reliable: stability.filter((s) => s.status === "reliable").length,
    flicker: stability.filter((s) => s.status === "flicker").length,
    absent: stability.filter((s) => s.status === "absent").length,
    single: stability.filter((s) => s.status === "single").length,
  };

  // ── Head to head ───────────────────────────────────────────────────────────
  const rivals = brands.filter((b) => !b.isOwn).slice(0, 12).map((b) => b.name);
  const rivalName =
    rivals.find((r) => key(r) === key(rivalParam ?? "")) ?? rivals[0] ?? null;
  let headToHead: HeadToHead | null = null;
  if (rivalName) {
    const rk = lookupKey(rivalName);
    const perIntent = new Map<string, { runs: number; rival: number; own: number }>();
    const rivalDomains = new Map<string, number>();
    const ownDomains = new Map<string, number>();
    let rivalRuns = 0;
    let ownRuns = 0;
    for (const run of allRuns) {
      const bs = brandsInRun(run);
      const hasRival = bs.has(rk);
      const hasOwn = [...bs.values()].some((b) => b.isOwn);
      const intent = run.visibility_prompts?.intents?.name ?? "unknown";
      const e = perIntent.get(intent) ?? { runs: 0, rival: 0, own: 0 };
      e.runs += 1;
      if (hasRival) {
        e.rival += 1;
        rivalRuns += 1;
        for (const c of run.visibility_citations) rivalDomains.set(c.domain, (rivalDomains.get(c.domain) ?? 0) + 1);
      }
      if (hasOwn) {
        e.own += 1;
        ownRuns += 1;
        for (const c of run.visibility_citations) ownDomains.set(c.domain, (ownDomains.get(c.domain) ?? 0) + 1);
      }
      perIntent.set(intent, e);
    }
    const toSources = (m: Map<string, number>) =>
      [...m.entries()]
        .map(([domain, count]) => ({ domain, category: classifyDomain(domain), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    headToHead = {
      rival: rivalName,
      rivalRuns,
      ownRuns,
      rivalOnly: [...perIntent.entries()]
        .filter(([, e]) => e.rival > 0 && e.own === 0)
        .map(([intent, e]) => ({ intent, rivalRuns: e.rival, runs: e.runs }))
        .sort((a, b) => b.rivalRuns - a.rivalRuns),
      bothPresent: [...perIntent.entries()]
        .filter(([, e]) => e.rival > 0 && e.own > 0)
        .map(([intent, e]) => ({ intent, rivalRuns: e.rival, ownRuns: e.own, runs: e.runs }))
        .sort((a, b) => b.rivalRuns - a.rivalRuns),
      ownOnly: [...perIntent.entries()]
        .filter(([, e]) => e.own > 0 && e.rival === 0)
        .map(([intent, e]) => ({ intent, ownRuns: e.own, runs: e.runs }))
        .sort((a, b) => b.ownRuns - a.ownRuns),
      rivalSources: toSources(rivalDomains),
      ownSources: toSources(ownDomains),
    };
  }

  return {
    hasData: true,
    venueName,
    shareOfVoice,
    categoryRuns: runs.length,
    dates,
    latestDate,
    latestLabel: periodLabel(latestPeriod),
    latestRuns: runs.length,
    brands,
    timeline,
    timelineBrands,
    byIntent,
    byPlatform,
    byLanguage,
    positions,
    stability,
    stabilitySummary,
    rivals,
    headToHead,
  };
}
