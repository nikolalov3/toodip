import "server-only";

import { requireSession } from "@/lib/auth/session";
import { getUserClient } from "@/lib/supabase/server";

/**
 * Read model for the visibility module.
 *
 * The dataset per tenant is small (hundreds of runs), so aggregation happens
 * here rather than in SQL. The rules encoded below come from the Profound
 * recon: branded intents never mix with category intents, verdicts need a
 * minimum sample, and leaders plus zeros are the only stable signals.
 */

export type Platform = "chatgpt" | "google_aio" | "perplexity" | "other";

export type SourceCategory =
  | "Google"
  | "Social"
  | "Guides & blogs"
  | "Travel aggregators"
  | "Reddit"
  | "Other & venue sites";

export interface IntentSummary {
  name: string;
  language: string;
  isBranded: boolean;
  runs: number;
  ownMentions: number;
  /** none = gate 1, flicker = unstable, present = stable signal */
  status: "none" | "flicker" | "present";
  owners: Array<{ name: string; count: number; share: number }>;
}

export interface PlatformSummary {
  platform: Platform;
  runs: number;
  ownMentions: number;
  topDomains: Array<{ domain: string; count: number }>;
}

export interface LeaderboardRow {
  name: string;
  isOwn: boolean;
  runsMentioned: number;
  share: number;
}

export interface DomainRow {
  domain: string;
  category: SourceCategory;
  total: number;
  byPlatform: Record<"chatgpt" | "google_aio" | "perplexity", number>;
  /** How many of the runs citing this domain also mentioned the venue. */
  runsWithOwnMention: number;
}

export interface PromptSummary {
  text: string;
  intent: string;
  isBranded: boolean;
  language: string;
  runs: number;
  ownMentions: number;
  platforms: Platform[];
}

export interface RunPreview {
  id: string;
  platform: Platform;
  executedOn: string;
  prompt: string;
  intent: string;
  mentionedOwn: boolean;
  mentions: string[];
  citations: string[];
  responseText: string | null;
}

export interface InterventionRow {
  id: string;
  kind: string;
  surface: string;
  description: string;
  performedOn: string;
}

/** One measured day: category runs only, branded intents excluded. */
export interface TrendPoint {
  date: string;
  runs: number;
  ownMentions: number;
  /** Share of category runs that day that mentioned the venue, 0..1. */
  score: number;
  /** Interventions logged that day, for markers on the chart. */
  interventions: number;
}

export interface VisibilityOverview {
  hasData: boolean;
  sources: string[];
  dates: string[];
  timeline: TrendPoint[];
  totalRuns: number;
  totalCitations: number;
  categoryRuns: number;
  categoryOwnMentions: number;
  intents: IntentSummary[];
  platforms: PlatformSummary[];
  leaderboard: LeaderboardRow[];
  domains: DomainRow[];
  prompts: PromptSummary[];
  recentRuns: RunPreview[];
  interventions: InterventionRow[];
}

interface RunRow {
  id: string;
  platform: Platform;
  executed_on: string;
  source: string;
  response_text: string | null;
  visibility_prompts: {
    text: string;
    language: string;
    intents: { name: string; language: string; is_branded: boolean } | null;
  } | null;
  visibility_mentions: Array<{ name: string; is_own: boolean }>;
  visibility_citations: Array<{ domain: string }>;
}

const SOCIAL = /instagram|facebook|youtube|tiktok|pinterest/;
const TRAVEL = /tripadvisor|wanderlog|yelp|booking|airbnb/;
const GUIDES =
  /kukbuk|krakowfood|gojammin|polskapogodzinach|vogue|twojstyl|smartblonde|naszemiasto|krakow\.com|krakowcitybreaks|krakow-trip|bestofwarsaw|najlepszewwarszawie|warsawcity|kawa\.pl|foodie|magazyn|przewodnik/;

export function classifyDomain(domain: string): SourceCategory {
  if (/(^|\.)google\./.test(domain) || domain === "google.com") return "Google";
  if (SOCIAL.test(domain)) return "Social";
  if (/reddit/.test(domain)) return "Reddit";
  if (TRAVEL.test(domain)) return "Travel aggregators";
  if (GUIDES.test(domain)) return "Guides & blogs";
  return "Other & venue sites";
}

function topCounts(
  values: string[],
  limit: number,
): Array<{ domain: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([domain, count]) => ({ domain, count }));
}

export async function getVisibilityOverview(): Promise<VisibilityOverview> {
  const session = await requireSession();
  const supabase = await getUserClient();

  const [runsResult, interventionsResult] = await Promise.all([
    supabase
      .from("visibility_runs")
      .select(
        "id, platform, executed_on, source, response_text, visibility_prompts(text, language, intents(name, language, is_branded)), visibility_mentions(name, is_own), visibility_citations(domain)",
      )
      .eq("tenant_id", session.tenantId)
      .order("executed_on", { ascending: false })
      .limit(2000),
    supabase
      .from("interventions")
      .select("id, kind, surface, description, performed_on")
      .eq("tenant_id", session.tenantId)
      .order("performed_on", { ascending: false })
      .limit(50),
  ]);

  const runs = (runsResult.data ?? []) as unknown as RunRow[];
  const interventions = (interventionsResult.data ?? []).map((row) => ({
    id: row.id as string,
    kind: row.kind as string,
    surface: row.surface as string,
    description: row.description as string,
    performedOn: row.performed_on as string,
  }));

  if (runs.length === 0) {
    return {
      hasData: false,
      sources: [],
      dates: [],
      timeline: [],
      totalRuns: 0,
      totalCitations: 0,
      categoryRuns: 0,
      categoryOwnMentions: 0,
      intents: [],
      platforms: [],
      leaderboard: [],
      domains: [],
      prompts: [],
      recentRuns: [],
      interventions,
    };
  }

  const categoryRuns = runs.filter(
    (run) => !run.visibility_prompts?.intents?.is_branded,
  );

  // ── Per intent: ownership table and the venue's own status ────────────────
  const byIntent = new Map<string, RunRow[]>();
  for (const run of runs) {
    const intent = run.visibility_prompts?.intents?.name ?? "unknown";
    byIntent.set(intent, [...(byIntent.get(intent) ?? []), run]);
  }

  const intents: IntentSummary[] = [...byIntent.entries()].map(
    ([name, intentRuns]) => {
      const meta = intentRuns[0].visibility_prompts?.intents;
      const ownMentions = intentRuns.filter((run) =>
        run.visibility_mentions.some((m) => m.is_own),
      ).length;

      const ownerCounts = new Map<string, { display: string; count: number }>();
      for (const run of intentRuns) {
        const seen = new Set<string>();
        for (const mention of run.visibility_mentions) {
          const key = mention.name.toLowerCase().trim();
          if (seen.has(key)) continue;
          seen.add(key);
          const entry = ownerCounts.get(key) ?? { display: mention.name, count: 0 };
          entry.count += 1;
          ownerCounts.set(key, entry);
        }
      }
      const owners = [...ownerCounts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((entry) => ({
          name: entry.display,
          count: entry.count,
          share: entry.count / intentRuns.length,
        }));

      return {
        name,
        language: meta?.language ?? "pl",
        isBranded: meta?.is_branded ?? false,
        runs: intentRuns.length,
        ownMentions,
        status:
          ownMentions === 0
            ? ("none" as const)
            : ownMentions / intentRuns.length >= 0.25
              ? ("present" as const)
              : ("flicker" as const),
        owners,
      };
    },
  );

  intents.sort(
    (a, b) => Number(a.isBranded) - Number(b.isBranded) || a.name.localeCompare(b.name),
  );

  // ── Share of voice across category runs ───────────────────────────────────
  const brandCounts = new Map<string, { display: string; count: number; isOwn: boolean }>();
  for (const run of categoryRuns) {
    const seen = new Set<string>();
    for (const mention of run.visibility_mentions) {
      const key = mention.name.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      const entry =
        brandCounts.get(key) ?? { display: mention.name, count: 0, isOwn: mention.is_own };
      entry.count += 1;
      entry.isOwn = entry.isOwn || mention.is_own;
      brandCounts.set(key, entry);
    }
  }
  const leaderboard: LeaderboardRow[] = [...brandCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map((entry) => ({
      name: entry.display,
      isOwn: entry.isOwn,
      runsMentioned: entry.count,
      share: entry.count / Math.max(categoryRuns.length, 1),
    }));
  // The venue always appears on its own leaderboard, even at zero.
  if (!leaderboard.some((row) => row.isOwn)) {
    const own = [...brandCounts.values()].find((entry) => entry.isOwn);
    leaderboard.push({
      name: own?.display ?? "This venue",
      isOwn: true,
      runsMentioned: own?.count ?? 0,
      share: (own?.count ?? 0) / Math.max(categoryRuns.length, 1),
    });
  }

  // ── Per platform: own mention rate and citation diet ──────────────────────
  const platforms: PlatformSummary[] = (
    ["chatgpt", "google_aio", "perplexity"] as Platform[]
  ).map((platform) => {
    const platformRuns = categoryRuns.filter((run) => run.platform === platform);
    return {
      platform,
      runs: platformRuns.length,
      ownMentions: platformRuns.filter((run) =>
        run.visibility_mentions.some((m) => m.is_own),
      ).length,
      topDomains: topCounts(
        platformRuns.flatMap((run) => run.visibility_citations.map((c) => c.domain)),
        5,
      ),
    };
  });

  // ── Full source table: domain x platform, with own-mention correlation ────
  const domainMap = new Map<string, DomainRow>();
  for (const run of runs) {
    const ownHere = run.visibility_mentions.some((m) => m.is_own);
    const seen = new Set<string>();
    for (const citation of run.visibility_citations) {
      const row =
        domainMap.get(citation.domain) ??
        ({
          domain: citation.domain,
          category: classifyDomain(citation.domain),
          total: 0,
          byPlatform: { chatgpt: 0, google_aio: 0, perplexity: 0 },
          runsWithOwnMention: 0,
        } satisfies DomainRow);
      row.total += 1;
      if (run.platform !== "other") row.byPlatform[run.platform] += 1;
      if (ownHere && !seen.has(citation.domain)) {
        row.runsWithOwnMention += 1;
        seen.add(citation.domain);
      }
      domainMap.set(citation.domain, row);
    }
  }
  const domains = [...domainMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 25);

  // ── Per prompt drill down ─────────────────────────────────────────────────
  const promptMap = new Map<string, PromptSummary>();
  for (const run of runs) {
    const text = run.visibility_prompts?.text ?? "unknown";
    const entry =
      promptMap.get(text) ??
      ({
        text,
        intent: run.visibility_prompts?.intents?.name ?? "unknown",
        isBranded: run.visibility_prompts?.intents?.is_branded ?? false,
        language: run.visibility_prompts?.language ?? "pl",
        runs: 0,
        ownMentions: 0,
        platforms: [],
      } satisfies PromptSummary);
    entry.runs += 1;
    if (run.visibility_mentions.some((m) => m.is_own)) entry.ownMentions += 1;
    if (!entry.platforms.includes(run.platform)) entry.platforms.push(run.platform);
    promptMap.set(text, entry);
  }
  const prompts = [...promptMap.values()].sort(
    (a, b) =>
      Number(a.isBranded) - Number(b.isBranded) ||
      b.ownMentions - a.ownMentions ||
      a.intent.localeCompare(b.intent),
  );

  // ── Raw responses, own mentions first so the interesting ones surface ─────
  const recentRuns: RunPreview[] = [...runs]
    .sort(
      (a, b) =>
        Number(b.visibility_mentions.some((m) => m.is_own)) -
        Number(a.visibility_mentions.some((m) => m.is_own)),
    )
    .slice(0, 30)
    .map((run) => ({
      id: run.id,
      platform: run.platform,
      executedOn: run.executed_on,
      prompt: run.visibility_prompts?.text ?? "unknown",
      intent: run.visibility_prompts?.intents?.name ?? "unknown",
      mentionedOwn: run.visibility_mentions.some((m) => m.is_own),
      mentions: run.visibility_mentions.map((m) => m.name),
      citations: [...new Set(run.visibility_citations.map((c) => c.domain))].slice(0, 8),
      responseText: run.response_text,
    }));

  // ── Score per day. Days with a thin battery are kept but flagged by their
  // run count, so the chart can render them honestly instead of hiding them.
  const byDate = new Map<string, { runs: number; own: number }>();
  for (const run of categoryRuns) {
    const entry = byDate.get(run.executed_on) ?? { runs: 0, own: 0 };
    entry.runs += 1;
    if (run.visibility_mentions.some((m) => m.is_own)) entry.own += 1;
    byDate.set(run.executed_on, entry);
  }
  const interventionsByDate = new Map<string, number>();
  for (const item of interventions) {
    interventionsByDate.set(
      item.performedOn,
      (interventionsByDate.get(item.performedOn) ?? 0) + 1,
    );
  }
  const timeline: TrendPoint[] = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, entry]) => ({
      date,
      runs: entry.runs,
      ownMentions: entry.own,
      score: entry.own / Math.max(entry.runs, 1),
      interventions: interventionsByDate.get(date) ?? 0,
    }));

  return {
    hasData: true,
    sources: [...new Set(runs.map((run) => run.source))],
    dates: [...new Set(runs.map((run) => run.executed_on))].sort(),
    timeline,
    totalRuns: runs.length,
    totalCitations: runs.reduce((sum, run) => sum + run.visibility_citations.length, 0),
    categoryRuns: categoryRuns.length,
    categoryOwnMentions: categoryRuns.filter((run) =>
      run.visibility_mentions.some((m) => m.is_own),
    ).length,
    intents,
    platforms,
    leaderboard,
    domains,
    prompts,
    recentRuns,
    interventions,
  };
}

/**
 * Appends to the interventions ledger. Failures are logged, never thrown: an
 * intervention record must not break the action it describes.
 */
export async function logIntervention(input: {
  kind: "record_update" | "review_reply" | "site_change" | "guide_entry" | "social_post" | "other";
  surface: string;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const session = await requireSession();
    const supabase = await getUserClient();
    const result = await supabase.from("interventions").insert({
      tenant_id: session.tenantId,
      kind: input.kind,
      surface: input.surface,
      description: input.description,
      actor_user_id: session.userId,
      metadata: input.metadata ?? {},
    });
    if (result.error) console.warn("[interventions]", result.error.message);
  } catch (error) {
    console.warn("[interventions]", (error as Error).message);
  }
}
