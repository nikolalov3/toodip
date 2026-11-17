import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { gscConfigured } from "@/lib/google/search-console";
import { periodKind, periodStart } from "@/lib/periods";
import { countMovement, detectablePoints, movement, rangeLabel, wilson } from "@/lib/stats-math";
import { loadGscSnapshot } from "@/services/gsc";
import { openRouterChat } from "@/services/measurement";
import { loadWeekTraffic, type WeekTraffic } from "@/services/stats";
import { ASSISTANT_NAME, loadVisibilityOverview, type VisibilityOverview } from "@/services/visibility";

/**
 * The analyst note: a summary in words of facts the panel has already
 * computed. The division of labour is strict:
 *
 *  - the PANEL computes every number, every comparison and every verdict
 *    ("more than chance explains", "inside the noise") with plain rules;
 *  - the MODEL (DeepSeek through OpenRouter, nothing else) only words the
 *    summary. It never sees raw answers and never computes a number;
 *  - a LINT checks the result: a sentence that states a number or a domain
 *    the facts do not contain is dropped;
 *  - when no model produces a clean note, the panel writes one itself from
 *    the same facts, so a report never goes without its summary.
 *
 * The facts are stored with the note, so every sentence can be checked.
 */

/**
 * DeepSeek v3.2 first: on the first live summary (17 Nov 2026) it returned a
 * clean note, while the two v4 models spent the token budget thinking and
 * returned nothing or half a JSON object. They stay as fallbacks, with room
 * to think (see max_tokens below).
 */
const ANALYST_MODELS = () =>
  (process.env.OPENROUTER_ANALYST_MODEL?.trim() || "deepseek/deepseek-v3.2,deepseek/deepseek-v4.1-flash,deepseek/deepseek-v4-pro")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

/** The note the panel writes itself when no model returns a clean one. */
export const TEMPLATE_MODEL = "template";

type FactKind =
  | "measurement"
  | "score"
  | "range"
  | "sov"
  | "rank"
  | "cited"
  | "backing"
  | "previous"
  | "move"
  | "sov_move"
  | "change"
  | "assistant"
  | "type"
  | "plan"
  | "gap"
  | "words"
  | "quote"
  | "traffic"
  | "traffic_ai"
  | "bots"
  | "demand";

export interface Fact {
  id: string;
  text: string;
  kind?: FactKind;
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
const signed = (n: number) => `${n > 0 ? "+" : ""}${n}`;
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Everything the model may say, as short numbered statements. Ordered from
 * the headline numbers to the detail, so a truncated packet still carries
 * the essentials. Verdicts about chance are stated here, by the panel.
 */
export function factsFrom(
  overview: VisibilityOverview,
  venueName: string,
  extras: { traffic?: TrafficFacts | null; week?: WeekTraffic | null; demand?: DemandFact[] } = {},
): Fact[] {
  const facts: Fact[] = [];
  const add = (kind: FactKind, text: string) => facts.push({ id: `f${facts.length + 1}`, text, kind });
  const current = overview.current;
  if (!current) return facts;
  const m = overview.metrics;
  const n = overview.categoryRuns;
  const k = overview.categoryOwnMentions;

  const assistant = ASSISTANT_NAME[current.platform];
  add("measurement", `Latest measurement: ${current.label}, ${n} category answers from ${assistant} (${current.method.label}), ${current.method.reps} repetitions per question.`);
  add("score", `${venueName} is named in ${pct(m.brandMentionRate)} of ${assistant} answers (${k} of ${n}).`);
  add("range", `With ${n} answers the true rate plausibly lies between ${rangeLabel(wilson(k, n))}; a single measurement cannot say more precisely.`);
  add("sov", `Share of voice ${pct(m.shareOfVoice)}: ${venueName}'s mentions as a share of all ${overview.totalAppearances} venue mentions across ${m.sovBrands} venues.`);
  add("rank", m.sovRank ? `Rank #${m.sovRank} of ${m.sovBrands} venues named for the same questions.` : `Not ranked: no answer named ${venueName}.`);
  add(
    "cited",
    m.citationRate > 0
      ? `Own website or profiles cited as a source in ${pct(m.citationRate)} of answers (${m.ownCitedSources.slice(0, 3).join(", ")}).`
      : "No answer cites the venue's own website or profiles as a source.",
  );
  if (overview.ownSources.length > 0) {
    add("backing", `Sources cited at the list items naming ${venueName}: ${overview.ownSources.slice(0, 4).map((s) => `${s.domain} (${s.count} answers)`).join(", ")}.`);
  } else if (overview.attributable > 0) {
    add("backing", `No source is cited at the list items naming ${venueName}: the assistant names it from memory.`);
  }

  const c = overview.changes;
  if (c?.comparable && c.previous) {
    const before = c.previous;
    add("previous", `Previous comparable measurement: ${before.label}, ${before.categoryRuns} answers, same method.`);
    const verdict = movement(before.ownMentions, before.categoryRuns, k, n);
    const threshold = detectablePoints(before.categoryRuns, n, m.brandMentionRate);
    add(
      "move",
      `Named in answers moved from ${pct(c.scoreBefore ?? 0)} (${before.ownMentions} of ${before.categoryRuns}) to ${pct(m.brandMentionRate)} (${k} of ${n}), ${signed(c.scoreDelta ?? 0)} points. ` +
        (verdict === "noise"
          ? `This is inside the noise: two measurements of an unchanged venue differ this much by chance, and it takes about ${threshold} points at this sample to count as a real change.`
          : `This is a real ${verdict === "up" ? "rise" : "fall"}: more than chance between two measurements explains.`),
    );
    add("sov_move", `Share of voice moved from ${pct(c.sovBefore ?? 0)} to ${pct(m.shareOfVoice)} (${signed(c.sovDelta ?? 0)} points).`);
    if (c.backingBefore.length > 0 || c.backingAfter.length > 0) {
      add(
        "change",
        `Sources behind ${venueName}'s mentions, then and now: ${c.backingBefore.map((s) => `${s.domain} (${s.count})`).join(", ") || "none"} → ${c.backingAfter.map((s) => `${s.domain} (${s.count})`).join(", ") || "none"}.`,
      );
    }
    for (const i of c.intents.slice(0, 5)) {
      add("change", `Question type "${i.name}" went from ${i.before} (${pct(i.beforeRate)}) to ${i.after} (${pct(i.afterRate)}).`);
    }
    for (const b of c.brands.filter((x) => !x.isOwn).slice(0, 4)) {
      const real = movement(Math.round(b.before * before.categoryRuns), before.categoryRuns, Math.round(b.after * n), n) !== "noise";
      add("change", `Rival ${b.name}: named in ${pct(b.before)} of answers before, ${pct(b.after)} now${real ? ", a real movement" : ", within the noise"}.`);
    }
    if (c.questionsWon.length > 0) add("change", `Questions won since last time (${c.questionsWon.length}): ${c.questionsWon.slice(0, 4).map((q) => `"${q.text}" (${q.before}→${q.after} of ${q.runs})`).join("; ")}.`);
    if (c.questionsLost.length > 0) add("change", `Questions lost since last time (${c.questionsLost.length}): ${c.questionsLost.slice(0, 4).map((q) => `"${q.text}" (${q.before}→${q.after} of ${q.runs})`).join("; ")}.`);
    if (c.newSources.length > 0) add("change", `Sources the assistant cites now but not last time: ${c.newSources.slice(0, 5).map((s) => `${s.domain} (${s.count})`).join(", ")}.`);
    if (c.goneSources.length > 0) add("change", `Sources cited last time but not now: ${c.goneSources.slice(0, 5).map((s) => `${s.domain} (${s.count})`).join(", ")}.`);
  } else if (c && !c.comparable) {
    add(
      "previous",
      c.otherMethodPrevious
        ? `The previous measurement (${c.otherMethodPrevious.label}) used another method (${c.otherMethodPrevious.method}); its numbers are not comparable with this one.`
        : "No earlier measurement made the same way; nothing to compare with yet.",
    );
  } else {
    add("previous", `This is the first ${assistant} measurement made this way; nothing to compare with yet.`);
  }

  // The other assistants asked the same questions in the same period.
  const cmp = overview.comparison;
  if (cmp) {
    const mine = cmp.columns.findIndex((col) => col.seriesId === current.seriesId);
    cmp.columns.forEach((col, index) => {
      if (index === mine) return;
      const verdict = movement(k, n, col.ownMentions, col.categoryRuns);
      add(
        "assistant",
        `Asked the same questions in the same period, ${col.assistant} (${col.label}) names ${venueName} in ${pct(col.score)} of answers (${col.ownMentions} of ${col.categoryRuns}), against ${pct(m.brandMentionRate)} on ${assistant}. ` +
          (verdict === "noise" ? "The two assistants do not differ by more than chance." : `${verdict === "up" ? col.assistant : assistant} names it clearly more often.`),
      );
      const gaps = cmp.intents
        .map((row) => ({ name: row.name, here: row.cells[mine], there: row.cells[index] }))
        .filter((row) => row.here && row.there && row.here.runs >= 2 && row.there.runs >= 2)
        .map((row) => ({ ...row, diff: row.there.own / row.there.runs - row.here.own / row.here.runs }))
        .filter((row) => Math.abs(row.diff) >= 0.34)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 3);
      for (const gap of gaps) {
        add(
          "assistant",
          `Type "${gap.name}": ${col.assistant} names ${venueName} in ${gap.there.own} of ${gap.there.runs} answers, ${assistant} in ${gap.here.own} of ${gap.here.runs}.`,
        );
      }
    });
  }

  const types = overview.intents.filter((i) => !i.isBranded);
  for (const i of types.slice(0, 9)) {
    const lead = i.leader ? `; leader ${i.leader.name} ${pct(i.leader.share)}${i.leader.sources.length ? `, read from ${i.leader.sources.map((s) => s.domain).join(", ")}` : ""}` : "; no rival dominates";
    add("type", `Type "${i.name}" (${i.language}): ${i.ownMentions} of ${i.runs} answers name ${venueName} (${i.status})${lead}.`);
  }
  for (const a of overview.actions.slice(0, 6)) add("plan", `Plan item (${a.kind}): ${a.title}. ${a.why} ${a.affects} answers at stake.`);
  for (const g of overview.gapSources.slice(0, 5)) {
    add(
      "gap",
      g.ownerRival
        ? `${g.domain} is ${g.ownerRival}'s own website, cited at their item in ${g.count} answers and never at ${venueName}'s.`
        : `${g.domain} (${g.category}) is cited at a rival's item in ${g.count} answers (${g.rivals.join(", ")}) and never at ${venueName}'s.`,
    );
  }
  if (overview.descriptors.length > 0) add("words", `Words most often next to ${venueName}'s name: ${overview.descriptors.map((d) => `${d.word} (${d.count})`).join(", ")}.`);
  if (overview.rivalDescriptors) add("words", `Words most often next to ${overview.rivalDescriptors.name}'s name: ${overview.rivalDescriptors.words.map((d) => `${d.word} (${d.count})`).join(", ")}.`);
  for (const q of overview.quotes.slice(0, 2)) add("quote", `An assistant wrote, asked "${q.prompt}": "${q.text}"`);

  // The site's traffic in the week the report closes, next to the week before.
  const week = extras.week;
  if (week?.site && !week.error) {
    const w = week.current;
    const p = week.previous;
    const span = `${dayLabel(w.from)} to ${dayLabel(w.to)}`;
    const viewsVerdict = countMovement(p.pageviews, w.pageviews);
    add(
      "traffic",
      `Website traffic, ${span}: ${w.pageviews} page views by ${w.visitors} visitors; the week before: ${p.pageviews} page views by ${p.visitors} visitors. ` +
        (viewsVerdict === "noise" ? "A difference this size is ordinary week to week wobble, not a change." : `This is a real ${viewsVerdict === "up" ? "rise" : "fall"} in page views.`),
    );
    const aiVerdict = countMovement(p.aiVisits, w.aiVisits);
    add(
      "traffic_ai",
      `Visits from AI assistants, ${span}: ${w.aiVisits} (${w.byAssistant.map((a) => `${a.label} ${a.value}`).join(", ") || "none"}); the week before: ${p.aiVisits}. ` +
        (aiVerdict === "noise" ? "At counts this small the difference is within week to week wobble." : `This is a real ${aiVerdict === "up" ? "rise" : "fall"}.`),
    );
    if (w.aiLanding.length > 0) add("traffic_ai", `Pages the assistants sent people to: ${w.aiLanding.slice(0, 4).map((l) => `${l.label} (${l.value})`).join(", ")}.`);
    if (w.conversions > 0 || p.conversions > 0) {
      add("traffic", `Conversions on the site, ${span}: ${w.conversions} (${w.aiConversions} by visitors who came from an assistant); the week before: ${p.conversions}.`);
    }
    if (w.botHits > 0 || p.botHits > 0) {
      add("bots", `AI crawlers fetched the site ${w.botHits} times, ${span} (${w.bots.slice(0, 4).map((b) => `${b.label} ${b.value}`).join(", ") || "none"}); the week before: ${p.botHits}.`);
    }
  } else if (extras.traffic) {
    add("traffic", `Website traffic, last ${extras.traffic.days} days: ${extras.traffic.pageviews} page views, ${extras.traffic.fromAi} visits from AI assistants.`);
  }
  for (const d of (extras.demand ?? []).slice(0, 6)) {
    add("demand", `Google demand for type "${d.intent}", last 28 days: ${d.impressions} impressions, ${d.clicks} clicks in Search Console. Compare with how often Google's AI names the venue for this type.`);
  }
  return facts;
}

const SYSTEM_PROMPT = `You word the summary on toodip's AI Visibility panel for one local venue. You receive numbered facts the panel computed from stored AI answers, website traffic and (when present) Google Search Console. Write for the venue's owner.

Rules:
- Use only the facts. Every point cites the fact ids it rests on. Never state a number, a source, a competitor or a cause that is not in the facts. Do no arithmetic: copy numbers exactly as the facts give them.
- The facts already say whether a movement is real or inside the noise. Repeat that verdict; never call a movement a gain or a loss when a fact calls it noise.
- When two facts suggest a cause, say "likely" or "this suggests": it is a hypothesis, not a finding.
- Lead with the biggest real movement and what explains it; if nothing really moved, say so plainly and lead with where the venue stands. Then what matters most now; then the single first thing to do and why that one. When another assistant or the site's traffic is in the facts, give each one point.
- Plain English, sentence case, short sentences, no marketing words, no exclamation marks, no em dashes.
- 4 to 6 points, each one or two sentences. A headline under 90 characters that states the main movement or state in numbers, and nothing else: no cause, no advice.

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

/** The numbers and domains a sentence states. */
function claimsOf(text: string): string[] {
  const lower = text.toLowerCase();
  const domains = lower.match(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/g) ?? [];
  // A domain's own digits ("web3.pl") are part of the name, not a number claimed.
  const withoutDomains = domains.reduce((rest, domain) => rest.split(domain).join(" "), lower);
  const numbers = (withoutDomains.match(/\d+(?:[.,]\d+)?/g) ?? []).map((value) => value.replace(",", "."));
  return [...numbers, ...domains];
}

/**
 * The lint: a sentence is kept only when every number and every domain it
 * states appears in the facts it cites. Checking against the cited facts,
 * not the whole packet, is what catches an invented "15%" when some other
 * fact happens to mention the 15th of the month. Returns the sentences
 * that pass.
 */
export function lintPoints(points: AnalystPoint[], facts: Fact[]): AnalystPoint[] {
  const byId = new Map(facts.map((fact) => [fact.id, fact.text]));
  return points
    .map((point) => ({ text: point.text, facts: point.facts.filter((id) => byId.has(id)) }))
    .filter((point) => {
      const claims = claimsOf(point.text);
      if (claims.length === 0) return true;
      const supported = new Set(point.facts.flatMap((id) => claimsOf(byId.get(id) ?? "")));
      return claims.every((claim) => supported.has(claim));
    });
}

/**
 * The note the panel writes on its own: the facts that matter most, in the
 * order an analyst would give them, verbatim. Dry, and never wrong.
 */
export function templateNote(facts: Fact[], venueName: string): { headline: string; points: AnalystPoint[] } {
  const first = (kind: FactKind) => facts.find((fact) => fact.kind === kind);
  const all = (kind: FactKind) => facts.filter((fact) => fact.kind === kind);
  const score = first("score");
  const picks: Array<Fact | undefined> = [
    first("move") ?? first("previous"),
    first("range"),
    all("assistant")[0],
    all("type").find((fact) => /\((none|flicker)\)/.test(fact.text)) ?? first("type"),
    first("plan"),
    first("traffic_ai") ?? first("traffic"),
  ];
  const points = picks
    .filter((fact): fact is Fact => Boolean(fact))
    .map((fact) => ({ text: fact.text, facts: [fact.id] }));
  const headline = (score?.text ?? `${venueName}: latest measurement`).replace(/\.$/, "").slice(0, 110);
  return { headline, points };
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

/** Asks the DeepSeek models in order until one returns a note that passes the lint. */
async function wordNote(
  facts: Fact[],
  venueName: string,
): Promise<{ headline: string; points: AnalystPoint[]; model: string; costUsd: number | null }> {
  let cost = 0;
  let asked = false;
  for (const model of ANALYST_MODELS()) {
    try {
      const completion = await openRouterChat({
        model,
        temperature: 0.2,
        // Six points with citations run to about 600 tokens. The ceiling is far
        // above that because a model that reasons first spends tokens before it
        // writes, and a note cut mid-JSON is a note thrown away.
        max_tokens: 5000,
        reasoning: { effort: "low" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Venue: ${venueName}.\n\nFacts:\n${facts.map((f) => `${f.id}. ${f.text}`).join("\n")}` },
        ],
      });
      if (!completion) break; // no key on the server: the panel writes the note itself
      asked = true;
      cost += completion.costUsd ?? 0;
      const parsed = parseNote(completion.content);
      if (!parsed) {
        console.warn("[analyst] unreadable note from", completion.model, JSON.stringify(completion.content).slice(0, 300));
        continue;
      }
      const points = lintPoints(parsed.points, facts);
      // The headline cites nothing, so it is held to the facts as a whole.
      const headline = lintPoints([{ text: parsed.headline, facts: facts.map((fact) => fact.id) }], facts).length === 1 ? parsed.headline : "";
      if (points.length < parsed.points.length) {
        console.warn("[analyst]", completion.model, "stated", parsed.points.length - points.length, "sentence(s) the facts do not support; dropped");
      }
      if (points.length >= 3 && headline) return { headline, points, model: completion.model || model, costUsd: cost };
    } catch (error) {
      console.warn("[analyst]", model, (error as Error).message.slice(0, 200));
    }
  }
  return { ...templateNote(facts, venueName), model: TEMPLATE_MODEL, costUsd: asked ? cost : null };
}

/**
 * Computes the overview for one series of the workspace, turns it into
 * facts, has the summary worded and stores the note. One call per finished
 * measurement is the intended cadence; writing again for the same period
 * replaces nothing, it adds a newer note.
 */
export async function writeAnalystNote(
  supabase: SupabaseClient,
  tenantId: string,
  options: {
    createdBy: "panel" | "cron";
    /** Which series to write about; the page's default series when not given. */
    series?: string | null;
    traffic?: TrafficFacts | null;
    demand?: DemandFact[];
  },
): Promise<WriteNoteResult> {
  const [gsc, profile] = await Promise.all([
    loadGscSnapshot(supabase, tenantId, gscConfigured()),
    supabase.from("business_profiles").select("name").eq("tenant_id", tenantId).maybeSingle(),
  ]);
  const overview = await loadVisibilityOverview(supabase, tenantId, {
    demand: gsc.connected ? gsc.demand : undefined,
    series: options.series,
  });
  if (overview.error) return { ok: false, message: `Could not read the measurements: ${overview.error}` };
  if (!overview.hasData || !overview.current) return { ok: false, message: "No measurement to write about yet." };
  const venueName = (profile.data as { name: string } | null)?.name ?? "the venue";

  // A weekly report closes a week: its note reads that week's traffic too.
  const week =
    periodKind(overview.current.period) === "week"
      ? await loadWeekTraffic(supabase, tenantId, periodStart(overview.current.period)).catch(() => null)
      : null;

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
  const facts = factsFrom(overview, venueName, { traffic: options.traffic, week, demand });
  if (useGsc) {
    facts.push({
      id: `f${facts.length + 1}`,
      kind: "demand",
      text: `Google Search Console, last ${gsc.days} days: ${gsc.impressions} impressions and ${gsc.clicks} clicks in total; top queries: ${gsc.topQueries.slice(0, 5).map((q) => `"${q.query}" (${q.impressions})`).join(", ")}.`,
    });
    if (gsc.unmapped.length > 0) {
      facts.push({
        id: `f${facts.length + 1}`,
        kind: "demand",
        text: `Google queries with impressions that match no question type in the battery: ${gsc.unmapped.slice(0, 6).map((q) => `"${q.query}" (${q.impressions})`).join(", ")}.`,
      });
    }
  }

  const worded = await wordNote(facts, venueName);

  const inserted = await supabase
    .from("analyses")
    .insert({
      tenant_id: tenantId,
      period: overview.current.period,
      period_start: overview.current.start,
      method_key: overview.current.method.key,
      model: worded.model,
      headline: worded.headline,
      points: worded.points,
      facts,
      cost_usd: worded.costUsd,
      created_by: options.createdBy,
    })
    .select("id, period, method_key, model, headline, points, facts, cost_usd, created_by, created_at")
    .single();
  if (inserted.error) {
    const missing = /relation .*analyses.* does not exist|schema cache/i.test(inserted.error.message);
    // The wording was paid for; keep it in the server log when it cannot be stored.
    console.warn("[analyst] summary worded but not stored:", JSON.stringify({ model: worded.model, headline: worded.headline, points: worded.points }));
    return {
      ok: false,
      message: missing
        ? "The analyses table is missing: apply supabase/migrations/20261109120000_analyst_and_gsc.sql, then write the note again."
        : `Could not save the note: ${inserted.error.message}`,
    };
  }
  return { ok: true, note: toNote(inserted.data as AnalysisRow) };
}

/**
 * The notes of a finished report: one per assistant measured in its period.
 * Called by the cron when a job completes.
 */
export async function writeReportNotes(
  supabase: SupabaseClient,
  tenantId: string,
  options: { createdBy: "panel" | "cron"; period?: string },
): Promise<WriteNoteResult[]> {
  const overview = await loadVisibilityOverview(supabase, tenantId);
  if (overview.error) return [{ ok: false, message: `Could not read the measurements: ${overview.error}` }];
  if (!overview.hasData || !overview.current) return [{ ok: false, message: "No measurement to write about yet." }];
  const period = options.period ?? overview.current.period;
  const measured = overview.series.filter((s) => s.latest.period === period);
  const results: WriteNoteResult[] = [];
  for (const series of measured) {
    results.push(await writeAnalystNote(supabase, tenantId, { createdBy: options.createdBy, series: series.id }));
  }
  return results;
}
