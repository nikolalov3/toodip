import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { gscConfigured } from "@/lib/google/search-console";
import { loadGscSnapshot } from "@/services/gsc";
import { openRouterChat } from "@/services/measurement";
import { loadVisibilityOverview, type VisibilityOverview } from "@/services/visibility";

/**
 * The analyst note: a model reads facts the panel has already computed and
 * writes what they mean for the owner. It never sees raw answers and never
 * computes a number; every sentence cites the facts it rests on, and the
 * facts are stored with the note. Client data stays with one provider
 * (Claude through OpenRouter); the model is configurable.
 */

const ANALYST_MODEL = () => process.env.OPENROUTER_ANALYST_MODEL?.trim() || "anthropic/claude-sonnet-5.5";

export interface Fact {
  id: string;
  text: string;
}

export interface AnalystPoint {
  text: string;
  facts: string[];
}

export interface AnalystNote {
  id: string;
  period: string;
  methodKey: string;
  model: string;
  headline: string;
  points: AnalystPoint[];
  facts: Fact[];
  costUsd: number | null;
  createdBy: string;
  createdAt: string;
}

export interface TrafficFacts {
  days: number;
  pageviews: number;
  fromAi: number;
}

export interface DemandFact {
  intent: string;
  impressions: number;
  clicks: number;
}

interface AnalysisRow {
  id: string;
  period: string;
  method_key: string;
  model: string;
  headline: string;
  points: AnalystPoint[];
  facts: Fact[];
  cost_usd: number | string | null;
  created_by: string;
  created_at: string;
}

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

/**
 * Everything the model may say, as short numbered statements. Ordered from
 * the headline numbers to the detail, so a truncated packet still carries
 * the essentials.
 */
export function factsFrom(
  overview: VisibilityOverview,
  venueName: string,
  extras: { traffic?: TrafficFacts | null; demand?: DemandFact[] } = {},
): Fact[] {
  const facts: Fact[] = [];
  const add = (text: string) => facts.push({ id: `f${facts.length + 1}`, text });
  const current = overview.current;
  if (!current) return facts;
  const m = overview.metrics;

  const platformName = { chatgpt: "ChatGPT", google_aio: "Google AI (AI Mode / AI Overviews)", perplexity: "Perplexity", other: "an AI assistant" }[current.platform];
  add(`Latest measurement: ${current.label}, ${current.categoryRuns} category answers, ${current.method.label}, ${current.method.reps} repetitions per question, ${platformName} only.`);
  add(`${venueName} is named in ${pct(m.brandMentionRate)} of answers (${overview.categoryOwnMentions} of ${overview.categoryRuns}).`);
  add(`Share of voice ${pct(m.shareOfVoice)}: ${venueName}'s mentions as a share of all ${overview.totalAppearances} venue mentions across ${m.sovBrands} venues.`);
  add(m.sovRank ? `Rank #${m.sovRank} of ${m.sovBrands} venues named for the same questions.` : `Not ranked: no answer named ${venueName}.`);
  add(
    m.citationRate > 0
      ? `Own website or profiles cited as a source in ${pct(m.citationRate)} of answers (${m.ownCitedSources.slice(0, 3).join(", ")}).`
      : "No answer cites the venue's own website or profiles as a source.",
  );
  if (overview.ownSources.length > 0) {
    add(`Sources cited at the list items naming ${venueName}: ${overview.ownSources.slice(0, 4).map((s) => `${s.domain} (${s.count} answers)`).join(", ")}.`);
  } else if (overview.attributable > 0) {
    add(`No source is cited at the list items naming ${venueName}: the assistant names it from memory.`);
  }

  const c = overview.changes;
  if (c?.comparable && c.previous) {
    add(`Previous comparable measurement: ${c.previous.label}, ${c.previous.categoryRuns} answers, same method.`);
    add(`Named in answers moved from ${pct(c.scoreBefore ?? 0)} to ${pct(m.brandMentionRate)} (${c.scoreDelta! > 0 ? "+" : ""}${c.scoreDelta} points).`);
    add(`Share of voice moved from ${pct(c.sovBefore ?? 0)} to ${pct(m.shareOfVoice)} (${c.sovDelta! > 0 ? "+" : ""}${c.sovDelta} points).`);
    if (c.backingBefore.length > 0 || c.backingAfter.length > 0) {
      add(
        `Sources behind ${venueName}'s mentions, then and now: ${c.backingBefore.map((s) => `${s.domain} (${s.count})`).join(", ") || "none"} → ${c.backingAfter.map((s) => `${s.domain} (${s.count})`).join(", ") || "none"}.`,
      );
    }
    for (const i of c.intents.slice(0, 5)) {
      add(`Question type "${i.name}" went from ${i.before} (${pct(i.beforeRate)}) to ${i.after} (${pct(i.afterRate)}).`);
    }
    for (const b of c.brands.filter((x) => !x.isOwn).slice(0, 4)) {
      add(`Rival ${b.name}: named in ${pct(b.before)} of answers before, ${pct(b.after)} now.`);
    }
    if (c.questionsWon.length > 0) add(`Questions won since last time (${c.questionsWon.length}): ${c.questionsWon.slice(0, 4).map((q) => `"${q.text}" (${q.before}→${q.after} of ${q.runs})`).join("; ")}.`);
    if (c.questionsLost.length > 0) add(`Questions lost since last time (${c.questionsLost.length}): ${c.questionsLost.slice(0, 4).map((q) => `"${q.text}" (${q.before}→${q.after} of ${q.runs})`).join("; ")}.`);
    if (c.newSources.length > 0) add(`Sources the assistants cite now but not last time: ${c.newSources.slice(0, 5).map((s) => `${s.domain} (${s.count})`).join(", ")}.`);
    if (c.goneSources.length > 0) add(`Sources cited last time but not now: ${c.goneSources.slice(0, 5).map((s) => `${s.domain} (${s.count})`).join(", ")}.`);
  } else if (c && !c.comparable) {
    add(
      c.otherMethodPrevious
        ? `The previous measurement (${c.otherMethodPrevious.label}) used another method (${c.otherMethodPrevious.method}); its numbers are not comparable with this one.`
        : "No earlier measurement made the same way; nothing to compare with yet.",
    );
  } else {
    add("This is the first measurement; nothing to compare with yet.");
  }

  const types = overview.intents.filter((i) => !i.isBranded);
  for (const i of types.slice(0, 9)) {
    const lead = i.leader ? `; leader ${i.leader.name} ${pct(i.leader.share)}${i.leader.sources.length ? `, read from ${i.leader.sources.map((s) => s.domain).join(", ")}` : ""}` : "; no rival dominates";
    add(`Type "${i.name}" (${i.language}): ${i.ownMentions} of ${i.runs} answers name ${venueName} (${i.status})${lead}.`);
  }
  for (const a of overview.actions.slice(0, 6)) add(`Plan item (${a.kind}): ${a.title}. ${a.why} ${a.affects} answers at stake.`);
  for (const g of overview.gapSources.slice(0, 5)) {
    add(
      g.ownerRival
        ? `${g.domain} is ${g.ownerRival}'s own website, cited at their item in ${g.count} answers and never at ${venueName}'s.`
        : `${g.domain} (${g.category}) is cited at a rival's item in ${g.count} answers (${g.rivals.join(", ")}) and never at ${venueName}'s.`,
    );
  }
  if (overview.descriptors.length > 0) add(`Words most often next to ${venueName}'s name: ${overview.descriptors.map((d) => `${d.word} (${d.count})`).join(", ")}.`);
  if (overview.rivalDescriptors) add(`Words most often next to ${overview.rivalDescriptors.name}'s name: ${overview.rivalDescriptors.words.map((d) => `${d.word} (${d.count})`).join(", ")}.`);
  for (const q of overview.quotes.slice(0, 2)) add(`An assistant wrote, asked "${q.prompt}": "${q.text}"`);
  if (extras.traffic) {
    add(`Website traffic, last ${extras.traffic.days} days: ${extras.traffic.pageviews} page views, ${extras.traffic.fromAi} visits from AI assistants.`);
  }
  for (const d of (extras.demand ?? []).slice(0, 6)) {
    add(`Google demand for type "${d.intent}", last 28 days: ${d.impressions} impressions, ${d.clicks} clicks in Search Console. Compare with how often Google's AI names the venue for this type.`);
  }
  return facts;
}

const SYSTEM_PROMPT = `You are the analyst behind toodip's AI Visibility panel for one local venue. You receive numbered facts computed from stored AI answers (and, when present, website traffic and Google Search Console). Write for the venue's owner.

Rules:
- Use only the facts. Every point cites the fact ids it rests on. Never invent a number, a source, a competitor or a cause.
- When two facts suggest a cause, say "likely" or "this suggests": it is a hypothesis, not a finding.
- Lead with the biggest movement and what explains it; then what matters most now; then the single first thing to do and why that one. Add a caution when the sample is small (a type with 3 answers) or when there is nothing comparable.
- Plain English, sentence case, short sentences, no marketing words, no exclamation marks, no em dashes.
- 4 to 6 points, each one or two sentences. A headline under 90 characters that states the main movement or state in numbers.

Answer with JSON only, exactly this shape:
{"headline": "string", "points": [{"text": "string", "facts": ["f1", "f2"]}]}`;

function parseNote(content: string): { headline: string; points: AnalystPoint[] } | null {
  const trimmed = content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as { headline?: unknown; points?: unknown };
    const headline = typeof parsed.headline === "string" ? parsed.headline.trim() : "";
    const points = Array.isArray(parsed.points)
      ? parsed.points
          .map((p) => {
            const item = p as { text?: unknown; facts?: unknown };
            return {
              text: typeof item.text === "string" ? item.text.trim() : "",
              facts: Array.isArray(item.facts) ? item.facts.filter((f): f is string => typeof f === "string") : [],
            };
          })
          .filter((p) => p.text.length > 0)
      : [];
    if (!headline || points.length === 0) return null;
    return { headline, points };
  } catch {
    return null;
  }
}

function toNote(row: AnalysisRow): AnalystNote {
  return {
    id: row.id,
    period: row.period,
    methodKey: row.method_key,
    model: row.model,
    headline: row.headline,
    points: Array.isArray(row.points) ? row.points : [],
    facts: Array.isArray(row.facts) ? row.facts : [],
    costUsd: row.cost_usd === null ? null : Number(row.cost_usd),
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/** The latest note for a period and method, or null (also when the table is missing). */
export async function latestAnalystNote(
  supabase: SupabaseClient,
  tenantId: string,
  period: string,
  methodKey: string,
): Promise<AnalystNote | null> {
  const result = await supabase
    .from("analyses")
    .select("id, period, method_key, model, headline, points, facts, cost_usd, created_by, created_at")
    .eq("tenant_id", tenantId)
    .eq("period", period)
    .eq("method_key", methodKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error || !result.data) return null;
  return toNote(result.data as AnalysisRow);
}

export interface WriteNoteResult {
  ok: boolean;
  note?: AnalystNote;
  message?: string;
}

/**
 * Computes the overview for the workspace, turns it into facts, asks the
 * model, stores the note. One call per measurement is the intended cadence;
 * writing again for the same period replaces nothing, it adds a newer note.
 */
export async function writeAnalystNote(
  supabase: SupabaseClient,
  tenantId: string,
  options: { createdBy: "panel" | "cron"; traffic?: TrafficFacts | null; demand?: DemandFact[] },
): Promise<WriteNoteResult> {
  const [gsc, profile] = await Promise.all([
    loadGscSnapshot(supabase, tenantId, gscConfigured()),
    supabase.from("business_profiles").select("name").eq("tenant_id", tenantId).maybeSingle(),
  ]);
  const overview = await loadVisibilityOverview(supabase, tenantId, { demand: gsc.connected ? gsc.demand : undefined });
  if (overview.error) return { ok: false, message: `Could not read the measurements: ${overview.error}` };
  if (!overview.hasData || !overview.current) return { ok: false, message: "No measurement to write about yet." };
  const venueName = (profile.data as { name: string } | null)?.name ?? "the venue";

  // Search Console enters the analysis only next to Google's own answers:
  // the same people, the same engine, two sides of one picture.
  const useGsc = gsc.connected && overview.current.platform === "google_aio";
  const demand =
    options.demand ??
    (useGsc
      ? Object.entries(gsc.demand)
          .map(([intent, d]) => ({ intent, impressions: d.impressions, clicks: d.clicks }))
          .sort((a, b) => b.impressions - a.impressions)
      : []);
  const facts = factsFrom(overview, venueName, { traffic: options.traffic, demand });
  if (useGsc) {
    facts.push({
      id: `f${facts.length + 1}`,
      text: `Google Search Console, last ${gsc.days} days: ${gsc.impressions} impressions and ${gsc.clicks} clicks in total; top queries: ${gsc.topQueries.slice(0, 5).map((q) => `"${q.query}" (${q.impressions})`).join(", ")}.`,
    });
    if (gsc.unmapped.length > 0) {
      facts.push({
        id: `f${facts.length + 1}`,
        text: `Google queries with impressions that match no question type in the battery: ${gsc.unmapped.slice(0, 6).map((q) => `"${q.query}" (${q.impressions})`).join(", ")}.`,
      });
    }
  }
  const model = ANALYST_MODEL();
  const completion = await openRouterChat({
    model,
    temperature: 0.3,
    // Six points with citations run to about 600 tokens; the ceiling leaves
    // room so a longer answer is never cut mid-JSON.
    max_tokens: 1800,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Venue: ${venueName}.\n\nFacts:\n${facts.map((f) => `${f.id}. ${f.text}`).join("\n")}`,
      },
    ],
  });
  if (!completion) return { ok: false, message: "No OpenRouter key on the server; the analyst note needs OPENROUTER_API_KEY." };
  const parsed = parseNote(completion.content);
  if (!parsed) {
    console.warn("[analyst] unreadable note from", completion.model, JSON.stringify(completion.content).slice(0, 600));
    return { ok: false, message: "The model did not return a readable note. Try again." };
  }

  const known = new Set(facts.map((f) => f.id));
  const points = parsed.points.map((p) => ({ text: p.text, facts: p.facts.filter((id) => known.has(id)) }));

  const inserted = await supabase
    .from("analyses")
    .insert({
      tenant_id: tenantId,
      period: overview.current.period,
      period_start: overview.current.start,
      method_key: overview.current.method.key,
      model: completion.model || model,
      headline: parsed.headline,
      points,
      facts,
      cost_usd: completion.costUsd,
      created_by: options.createdBy,
    })
    .select("id, period, method_key, model, headline, points, facts, cost_usd, created_by, created_at")
    .single();
  if (inserted.error) {
    const missing = /relation .*analyses.* does not exist|schema cache/i.test(inserted.error.message);
    return {
      ok: false,
      message: missing
        ? "The analyses table is missing: apply supabase/migrations/20261109120000_analyst_and_gsc.sql, then write the note again."
        : `Could not save the note: ${inserted.error.message}`,
    };
  }
  return { ok: true, note: toNote(inserted.data as AnalysisRow) };
}
