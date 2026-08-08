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

export interface InterventionRow {
  id: string;
  kind: string;
  surface: string;
  description: string;
  performedOn: string;
}

export interface VisibilityOverview {
  hasData: boolean;
  sources: string[];
  dates: string[];
  totalRuns: number;
  categoryRuns: number;
  categoryOwnMentions: number;
  intents: IntentSummary[];
  platforms: PlatformSummary[];
  topDomains: Array<{ domain: string; count: number }>;
  interventions: InterventionRow[];
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
  visibility_mentions: Array<{ name: string; is_own: boolean }>;
  visibility_citations: Array<{ domain: string }>;
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
        "id, platform, executed_on, source, visibility_prompts(text, language, intents(name, language, is_branded)), visibility_mentions(name, is_own), visibility_citations(domain)",
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
      totalRuns: 0,
      categoryRuns: 0,
      categoryOwnMentions: 0,
      intents: [],
      platforms: [],
      topDomains: [],
      interventions,
    };
  }

  const categoryRuns = runs.filter(
    (run) => !run.visibility_prompts?.intents?.is_branded,
  );

  // Per intent: ownership table and the venue's own status.
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

      // Owners: how many runs of this intent mention each name. Case folding
      // is the entity resolution Profound skips; ours is minimal but present.
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

  intents.sort((a, b) => Number(a.isBranded) - Number(b.isBranded) || a.name.localeCompare(b.name));

  // Per platform: own mention rate and citation diet.
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

  return {
    hasData: true,
    sources: [...new Set(runs.map((run) => run.source))],
    dates: [...new Set(runs.map((run) => run.executed_on))].sort(),
    totalRuns: runs.length,
    categoryRuns: categoryRuns.length,
    categoryOwnMentions: categoryRuns.filter((run) =>
      run.visibility_mentions.some((m) => m.is_own),
    ).length,
    intents,
    platforms,
    topDomains: topCounts(
      runs.flatMap((run) => run.visibility_citations.map((c) => c.domain)),
      12,
    ),
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
