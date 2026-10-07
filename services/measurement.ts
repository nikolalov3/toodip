import "server-only";

import { canEditSettings, requireSession } from "@/lib/auth/session";
import { PLANS } from "@/lib/billing";
import { getUserClient } from "@/lib/supabase/server";
import { getBillingSnapshot } from "@/services/billing";
import { classifyDomain } from "@/services/visibility";

/**
 * Executes the prompt battery against real AI platforms, from inside the app.
 *
 * Design, straight from the recon rules:
 * - One call here = one run: one prompt, one platform, one execution. The
 *   browser loops and shows progress, so serverless time limits never matter.
 * - ChatGPT goes through the Responses API with the web_search tool, because a
 *   model without search measures parametric memory, not what a ChatGPT user
 *   actually sees. Citations come from the same call as url annotations.
 * - Mentions are extracted by a small model into JSON. Extraction is a job AI
 *   is allowed to do in the pipes; deciding what the numbers mean is not.
 */

const OPENAI_BASE = () =>
  (process.env.OPENAI_BASE_URL?.replace(/\/$/, "") || "https://api.openai.com/v1");

const RUN_TIMEOUT_MS = 50_000;

/**
 * Per-run cost model, in USD. Defaults are gpt-4.1-mini list prices plus the
 * web_search tool call; override via env when the model or pricing changes.
 * The numbers land on every run (raw + typed columns) so the admin view shows
 * real cost per client instead of an estimate.
 */
const PRICE_IN_PER_M = Number(process.env.AI_PRICE_IN_PER_M ?? 0.4);
const PRICE_OUT_PER_M = Number(process.env.AI_PRICE_OUT_PER_M ?? 1.6);
const PRICE_WEB_SEARCH = Number(process.env.AI_PRICE_WEB_SEARCH ?? 0.025);

export function runCostUsd(tokensIn: number, tokensOut: number, webSearches: number): number {
  const cost =
    (tokensIn / 1_000_000) * PRICE_IN_PER_M +
    (tokensOut / 1_000_000) * PRICE_OUT_PER_M +
    webSearches * PRICE_WEB_SEARCH;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function measurementConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Words too generic to identify a venue by. */
const GENERIC = new Set([
  "cafe", "café", "kawiarnia", "coffee", "restaurant", "restauracja", "bar",
  "bistro", "the", "i", "and",
]);

/** A matcher for the venue's own name, tolerant of suffixes and case. */
export function ownNamePattern(businessName: string): RegExp {
  const words = businessName
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !GENERIC.has(word));
  const core = words[0] ?? businessName.toLowerCase();
  return new RegExp(core.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

async function callOpenAi(
  path: string,
  body: unknown,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
  try {
    const response = await fetch(`${OPENAI_BASE()}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 200)}`);
    }
    return (await response.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

interface SearchAnswer {
  text: string;
  model: string;
  citations: string[];
  usedSearch: boolean;
  webSearches: number;
  tokensIn: number;
  tokensOut: number;
}

/** Asks the model with web search on, and collects the cited URLs. */
async function askWithSearch(prompt: string, apiKey: string): Promise<SearchAnswer> {
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const data = await callOpenAi(
    "/responses",
    { model, input: prompt, tools: [{ type: "web_search" }] },
    apiKey,
  );

  const output = (data.output ?? []) as Array<Record<string, unknown>>;
  let text = "";
  const citations: string[] = [];
  let usedSearch = false;
  let webSearches = 0;

  for (const item of output) {
    if (item.type === "web_search_call") {
      usedSearch = true;
      webSearches += 1;
    }
    if (item.type !== "message") continue;
    for (const part of (item.content ?? []) as Array<Record<string, unknown>>) {
      if (typeof part.text === "string") text += part.text;
      for (const annotation of (part.annotations ?? []) as Array<Record<string, unknown>>) {
        if (typeof annotation.url === "string") citations.push(annotation.url);
      }
    }
  }

  const usage = (data.usage ?? {}) as Record<string, unknown>;
  return {
    text: text.trim(),
    model: (data.model as string) ?? model,
    citations: [...new Set(citations)],
    usedSearch,
    webSearches,
    tokensIn: Number(usage.input_tokens ?? 0) || 0,
    tokensOut: Number(usage.output_tokens ?? 0) || 0,
  };
}

interface Extraction {
  venues: string[];
  tokensIn: number;
  tokensOut: number;
}

/** Pulls the venue names out of an answer, in order of appearance. */
async function extractVenues(answer: string, apiKey: string): Promise<Extraction> {
  if (!answer.trim()) return { venues: [], tokensIn: 0, tokensOut: 0 };
  try {
    const data = await callOpenAi(
      "/chat/completions",
      {
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Extract the names of specific local venues (cafes, restaurants, bars, shops) mentioned in the text. Return JSON: {"venues": ["Name", ...]} in order of appearance. Proper names only, no categories, no cities, no duplicates.',
          },
          { role: "user", content: answer.slice(0, 6000) },
        ],
      },
      apiKey,
    );
    const content =
      ((data.choices as Array<Record<string, unknown>>)?.[0]?.message as Record<string, unknown>)
        ?.content;
    const parsed = JSON.parse(String(content ?? "{}")) as { venues?: unknown };
    const usage = (data.usage ?? {}) as Record<string, unknown>;
    return {
      venues: Array.isArray(parsed.venues)
        ? parsed.venues.filter((v): v is string => typeof v === "string").slice(0, 20)
        : [],
      tokensIn: Number(usage.prompt_tokens ?? 0) || 0,
      tokensOut: Number(usage.completion_tokens ?? 0) || 0,
    };
  } catch {
    // Extraction failing must not lose the run. The response text is stored
    // either way, so mentions can be re-extracted later.
    return { venues: [], tokensIn: 0, tokensOut: 0 };
  }
}

export interface RunOutcome {
  ok: boolean;
  mentionedOwn: boolean;
  mentions: string[];
  citations: number;
  usedSearch: boolean;
  /** What this execution cost, so the panel can total a report honestly. */
  costUsd?: number;
  error?: string;
}

/** One execution of one prompt, stored straight into the ledger. */
export async function executeVisibilityRun(promptId: string): Promise<RunOutcome> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) {
    return { ok: false, mentionedOwn: false, mentions: [], citations: 0, usedSearch: false, error: "Only admins can run measurements." };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, mentionedOwn: false, mentions: [], citations: 0, usedSearch: false, error: "OPENAI_API_KEY is not set." };
  }

  // Each run is a web_search call, the most expensive request in the app.
  // Runs are budgeted per plan and counted from the runs table itself, source
  // "toodip" only, so imported baselines never eat the budget.
  const billing = await getBillingSnapshot();
  const runsLimit = PLANS[billing.effectivePlan].monthlyRuns;
  if (runsLimit <= 0) {
    return {
      ok: false,
      mentionedOwn: false,
      mentions: [],
      citations: 0,
      usedSearch: false,
      error:
        "Measurements are part of the Visibility and Unlimited plans. Upgrade on the Billing page.",
    };
  }

  const supabase = await getUserClient();

  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
  const usedResult = await supabase
    .from("visibility_runs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", session.tenantId)
    .eq("source", "toodip")
    .gte("executed_on", monthStart);
  if ((usedResult.count ?? 0) >= runsLimit) {
    return {
      ok: false,
      mentionedOwn: false,
      mentions: [],
      citations: 0,
      usedSearch: false,
      error: `The ${PLANS[billing.effectivePlan].name} plan includes ${runsLimit} measurements a month and this workspace has used them.`,
    };
  }

  const promptResult = await supabase
    .from("visibility_prompts")
    .select("id, text, tenant_id")
    .eq("id", promptId)
    .eq("tenant_id", session.tenantId)
    .maybeSingle();
  if (promptResult.error || !promptResult.data) {
    return { ok: false, mentionedOwn: false, mentions: [], citations: 0, usedSearch: false, error: "Prompt not found in this workspace." };
  }

  const profileResult = await supabase
    .from("business_profiles")
    .select("name")
    .eq("tenant_id", session.tenantId)
    .limit(1)
    .maybeSingle();
  const ownPattern = ownNamePattern(
    (profileResult.data as { name: string } | null)?.name ?? session.tenantName,
  );

  try {
    const answer = await askWithSearch(promptResult.data.text as string, apiKey);
    const extracted = await extractVenues(answer.text, apiKey);
    const venues = extracted.venues;

    const tokensIn = answer.tokensIn + extracted.tokensIn;
    const tokensOut = answer.tokensOut + extracted.tokensOut;
    const costUsd = runCostUsd(tokensIn, tokensOut, answer.webSearches);

    const run = await supabase
      .from("visibility_runs")
      .insert({
        tenant_id: session.tenantId,
        prompt_id: promptId,
        platform: "chatgpt",
        model_version: answer.model,
        source: "toodip",
        executed_on: new Date().toISOString().slice(0, 10),
        response_text: answer.text,
        // Metering lives in raw too, so cost is recorded even before the typed
        // columns from the run_metering migration exist in an environment.
        raw: {
          used_search: answer.usedSearch,
          web_searches: answer.webSearches,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          cost_usd: costUsd,
        },
      })
      .select("id")
      .single();
    if (run.error) throw new Error(run.error.message);

    // Typed metering columns (run_metering migration). supabase-js reports a
    // missing column as an error value, not a throw, so a pre-migration
    // environment just keeps the numbers in raw.
    await supabase
      .from("visibility_runs")
      .update({ tokens_in: tokensIn, tokens_out: tokensOut, cost_usd: costUsd })
      .eq("id", run.data.id);

    // The extractor plus a direct pattern check: if the model named the venue
    // but the extractor missed it, the run still counts as a mention.
    const mentionRows = venues.map((name, index) => ({
      run_id: run.data.id,
      name,
      is_own: ownPattern.test(name),
      position: index + 1,
    }));
    const extractorFoundOwn = mentionRows.some((m) => m.is_own);
    if (!extractorFoundOwn && ownPattern.test(answer.text)) {
      mentionRows.push({
        run_id: run.data.id,
        name: (profileResult.data as { name: string } | null)?.name ?? session.tenantName,
        is_own: true,
        position: mentionRows.length + 1,
      });
    }
    if (mentionRows.length) {
      await supabase.from("visibility_mentions").insert(mentionRows);
    }

    if (answer.citations.length) {
      await supabase.from("visibility_citations").insert(
        answer.citations.slice(0, 25).map((url, index) => {
          let domain = "unknown";
          try {
            domain = new URL(url).hostname.replace(/^www\./, "");
          } catch {
            /* keep unknown */
          }
          return { run_id: run.data.id, url, domain, rank: index + 1 };
        }),
      );
    }

    return {
      ok: true,
      mentionedOwn: mentionRows.some((m) => m.is_own),
      mentions: mentionRows.map((m) => m.name),
      citations: answer.citations.length,
      usedSearch: answer.usedSearch,
      costUsd,
    };
  } catch (error) {
    return {
      ok: false,
      mentionedOwn: false,
      mentions: [],
      citations: 0,
      usedSearch: false,
      error: (error as Error).message,
    };
  }
}

// Suffix classification lives in visibility.ts; re-export for the panel.
export { classifyDomain };

/**
 * Prompt battery proposals, Profound style: realistic questions customers ask
 * an AI assistant before choosing a business, grouped into intents. Two paths:
 *
 * - generatePromptBattery: the assistant writes them from the FULL business
 *   profile, so the battery fits whatever the client added — a Berlin beauty
 *   salon gets German beauty prompts, not Krakow coffee. Works with whichever
 *   key is configured (OpenAI first, Gemini as fallback).
 * - suggestPromptBattery: deterministic templates covering every category the
 *   app knows, for workspaces with no key. Weaker on purpose, never wrong.
 *
 * Either way the human reviews every line before anything is saved.
 */
/** Which engine wrote a battery, so the UI can say so honestly. */
export type BatterySource = "openrouter" | "openai" | "gemini" | "templates";

export interface PromptProposal {
  intent: string;
  /** BCP-47ish two-letter code; the DB column is free text. */
  language: string;
  text: string;
  /** Branded prompts ask about the venue by name and never mix into category numbers. */
  isBranded: boolean;
}

/** What each category's customers are actually choosing between, per language. */
const CATEGORY_NOUNS: Record<string, { en: string; pl: string }> = {
  cafe: { en: "cafe", pl: "kawiarnia" },
  restaurant: { en: "restaurant", pl: "restauracja" },
  bakery: { en: "bakery", pl: "piekarnia" },
  bar: { en: "bar", pl: "bar" },
  hotel: { en: "hotel", pl: "hotel" },
  beauty: { en: "beauty salon", pl: "salon beauty" },
  clinic: { en: "clinic", pl: "klinika" },
  trades: { en: "service company", pl: "firma usługowa" },
  other: { en: "place", pl: "miejsce" },
};

/** Use cases per category that produce distinct, winnable intents. */
const CATEGORY_ANGLES: Record<string, string[]> = {
  cafe: ["to work with a laptop", "for breakfast", "for specialty coffee"],
  restaurant: ["for dinner with friends", "with vegetarian options", "for a business lunch"],
  bakery: ["for fresh bread in the morning", "with good pastries"],
  bar: ["for cocktails", "to watch a game"],
  hotel: ["for a weekend stay", "close to the center"],
  beauty: ["for a haircut", "for manicure", "for skin care"],
  clinic: ["accepting new patients", "with short waiting times"],
  trades: ["that is reliable and shows up on time", "with transparent pricing"],
  other: ["worth recommending"],
};

export function suggestPromptBattery(profile: {
  name?: string;
  category: string;
  city: string;
  district: string | null;
  languages?: string[];
}): PromptProposal[] {
  const { city, district } = profile;
  const noun = CATEGORY_NOUNS[profile.category] ?? CATEGORY_NOUNS.other;
  const angles = CATEGORY_ANGLES[profile.category] ?? CATEGORY_ANGLES.other;
  const wantsPolish = (profile.languages ?? ["pl"]).includes("pl");

  const proposals: PromptProposal[] = [
    { intent: `Best ${noun.en} in ${city}`, language: "en", isBranded: false, text: `What is the best ${noun.en} in ${city}?` },
    { intent: `Best ${noun.en} in ${city}`, language: "en", isBranded: false, text: `Can you recommend a good ${noun.en} in ${city}?` },
  ];
  if (wantsPolish) {
    proposals.push({
      intent: `Best ${noun.en} in ${city}`,
      language: "pl",
      isBranded: false,
      text: `Jaka jest najlepsza ${noun.pl} w ${city}? Polecisz coś?`,
    });
  }

  for (const angle of angles) {
    proposals.push({
      intent: angle,
      language: "en",
      isBranded: false,
      text: `Which ${noun.en} in ${city} is best ${angle}?`,
    });
  }

  if (district) {
    proposals.push(
      { intent: `Near ${district}`, language: "en", isBranded: false, text: `Good ${noun.en} near ${district} in ${city}?` },
      { intent: `Near ${district}`, language: "en", isBranded: false, text: `I am staying around ${district} in ${city} — where should I go for a ${noun.en}?` },
    );
  }

  if (profile.name) {
    proposals.push({
      intent: `Branded: ${profile.name}`,
      language: "en",
      isBranded: true,
      text: `What do people say about ${profile.name} in ${city}? Is it worth visiting?`,
    });
  }

  return proposals;
}

// ── AI generated battery ─────────────────────────────────────────────────────

export function batteryGenerationConfigured(): boolean {
  return Boolean(
    process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim(),
  );
}

/** Battery writing is a long structured-output call; fail over before the route's 60s cap. */
const GENERATION_TIMEOUT_MS = 55_000;
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

/**
 * First-choice engine for writing the battery: DeepSeek via OpenRouter. Cheap,
 * strong at long structured lists, and OpenAI-compatible, so it shares the
 * same instructions and JSON contract as the other providers.
 */
/**
 * DeepSeek routes on OpenRouter get rate-limited upstream in bursts (429). We
 * try a short list of model ids and retry a 429 once after a pause, all inside
 * one time budget so the whole generation stays under the route's 60s cap.
 */
const OPENROUTER_MODELS = (
  process.env.OPENROUTER_BATTERY_MODELS?.trim() ||
  "deepseek/deepseek-v4-flash,deepseek/deepseek-v3.2,deepseek/deepseek-chat-v3-0324"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

async function generateViaOpenRouter(
  profile: BatteryProfileInput,
  siteExcerpt: string,
  count: number,
  apiKey: string,
): Promise<string> {
  const startedAt = Date.now();
  const budgetLeft = () => GENERATION_TIMEOUT_MS - (Date.now() - startedAt);
  const messages = [
    { role: "system", content: batteryInstructions(count) },
    { role: "user", content: batteryUserMessage(profile, siteExcerpt) },
  ];
  let lastError = "no attempt";

  for (const model of OPENROUTER_MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const remaining = budgetLeft();
      if (remaining < 8_000) throw new Error(`OpenRouter: out of time (${lastError})`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), remaining);
      try {
        const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://toodip.com",
            "X-Title": "toodip battery agent",
          },
          body: JSON.stringify({
            model,
            response_format: { type: "json_object" },
            temperature: 0.7,
            provider: { allow_fallbacks: true },
            messages,
          }),
          signal: controller.signal,
        });
        if (response.status === 429) {
          lastError = `${model} 429`;
          // One pause then retry the same model; then move on to the next id.
          if (attempt === 0 && budgetLeft() > 12_000) {
            await new Promise((r) => setTimeout(r, 2_500));
            continue;
          }
          break;
        }
        if (!response.ok) {
          const detail = await response.text();
          lastError = `${model} ${response.status}: ${detail.slice(0, 160)}`;
          break; // a non-429 failure on this model: try the next id
        }
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim()) return content;
        lastError = `${model}: empty content`;
        break;
      } catch (error) {
        lastError = `${model}: ${(error as Error).message}`;
        break;
      } finally {
        clearTimeout(timeout);
      }
    }
  }
  throw new Error(`OpenRouter ${lastError}`);
}

export interface BatteryProfileInput {
  name: string;
  category: string;
  city: string;
  district: string | null;
  description: string;
  languages: string[];
  primaryLanguage: string;
  /** The client's own site; its text sharpens the niche intents. */
  websiteUrl?: string | null;
  /** How many prompts to aim for. The product default is 50. */
  targetCount?: number;
}

export const DEFAULT_BATTERY_SIZE = 50;
const MAX_BATTERY_SIZE = 100;

/**
 * Fetches the client's site and reduces it to plain text for the generator.
 * Best effort and bounded: a slow or odd site yields "" and the battery is
 * still written from the profile alone.
 */
async function fetchSiteContext(url: string | null | undefined): Promise<string> {
  if (!url) return "";
  let target: URL;
  try {
    target = new URL(url.includes("://") ? url : `https://${url}`);
  } catch {
    return "";
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(target.toString(), {
      signal: controller.signal,
      headers: { "user-agent": "toodip-battery-agent/1.0 (+https://toodip.com)" },
      redirect: "follow",
    });
    if (!response.ok) return "";
    const html = (await response.text()).slice(0, 400_000);
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 3_000);
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function batteryInstructions(count: number): string {
  const intents = Math.max(5, Math.round(count / 5));
  return `You design prompt batteries for measuring how visible a local business is in AI assistant answers (the way Profound or Adobe LLM Optimizer do).

Given a business profile (and, when present, an excerpt of its website), write the realistic questions this business's potential customers actually type into ChatGPT or Perplexity BEFORE choosing where to go. Rules:

- About ${count} prompts total, grouped into roughly ${intents} intents of 4-6 prompts each.
- An intent is one buying situation ("best X in CITY", "X near DISTRICT", one per typical use case of this category, comparison/ranking questions, occasion-based questions).
- Prompts must sound like real people: casual, specific, sometimes with context ("I'm visiting for a weekend...", "moj budzet to..."). Vary phrasing; no two prompts near-identical.
- Category prompts must NEVER contain the business name.
- Exactly ONE intent is branded: 3-4 prompts asking about the business by name (reviews, is it worth it, opening hours). Mark it "isBranded": true.
- Write prompts in the profile's languages, favoring the primary language; include English prompts if "en" is listed (tourists ask in English).
- Use the description and the website excerpt to find niche intents customers would ask about (specific products, services, dietary options, amenities) — but only ones this business could plausibly win.
- Intent names are short English labels regardless of prompt language.

Return ONLY JSON: {"proposals": [{"intent": "...", "language": "pl", "isBranded": false, "text": "..."}, ...]}`;
}

function batteryUserMessage(profile: BatteryProfileInput, siteExcerpt: string): string {
  return JSON.stringify({
    name: profile.name,
    category: profile.category,
    city: profile.city,
    district: profile.district,
    description: profile.description.slice(0, 1500),
    languages: profile.languages,
    primaryLanguage: profile.primaryLanguage,
    website: profile.websiteUrl ?? null,
    websiteExcerpt: siteExcerpt || null,
  });
}

async function generateViaOpenAi(
  profile: BatteryProfileInput,
  siteExcerpt: string,
  count: number,
  apiKey: string,
): Promise<string> {
  const data = await callOpenAi(
    "/chat/completions",
    {
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: batteryInstructions(count) },
        { role: "user", content: batteryUserMessage(profile, siteExcerpt) },
      ],
    },
    apiKey,
  );
  const content = (
    (data.choices as Array<Record<string, unknown>>)?.[0]?.message as
      | Record<string, unknown>
      | undefined
  )?.content;
  return String(content ?? "{}");
}

async function generateViaGemini(
  profile: BatteryProfileInput,
  siteExcerpt: string,
  count: number,
  apiKey: string,
): Promise<string> {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: batteryInstructions(count) }] },
          contents: [{ parts: [{ text: batteryUserMessage(profile, siteExcerpt) }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Gemini ${response.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sanity gate on model output. Bad lines are dropped, not fixed: the human
 * reviews the list anyway, and a silently "repaired" prompt is how a battery
 * ends up measuring something nobody wrote.
 */
function validateProposals(
  raw: string,
  businessName: string,
  cap: number,
): PromptProposal[] {
  let parsed: { proposals?: unknown };
  try {
    // Some models wrap JSON in a markdown fence despite JSON mode; tolerate it.
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    parsed = JSON.parse(cleaned) as { proposals?: unknown };
  } catch {
    return [];
  }
  if (!Array.isArray(parsed.proposals)) return [];

  const ownPattern = ownNamePattern(businessName);
  const seen = new Set<string>();
  const result: PromptProposal[] = [];
  for (const item of parsed.proposals as Array<Record<string, unknown>>) {
    const intent = typeof item.intent === "string" ? item.intent.trim() : "";
    const text = typeof item.text === "string" ? item.text.trim() : "";
    const language =
      typeof item.language === "string"
        ? item.language.trim().toLowerCase().slice(0, 5)
        : "";
    const isBranded = item.isBranded === true;
    if (intent.length < 2 || intent.length > 80) continue;
    if (text.length < 8 || text.length > 300) continue;
    if (!/^[a-z]{2}(-[a-z]{2})?$/.test(language)) continue;
    // A category prompt naming the venue would measure brand recall while
    // claiming to measure the category. Drop it.
    if (!isBranded && ownPattern.test(text)) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ intent, language, text, isBranded });
    if (result.length >= cap) break;
  }
  return result;
}

/** The assistant writes the battery from the profile; template fallback on failure. */
export async function generatePromptBattery(
  profile: BatteryProfileInput,
): Promise<{ proposals: PromptProposal[]; source: BatterySource }> {
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const count = Math.min(MAX_BATTERY_SIZE, Math.max(10, profile.targetCount ?? DEFAULT_BATTERY_SIZE));
  // A little headroom above the target, since validation drops some lines.
  const cap = Math.min(MAX_BATTERY_SIZE + 20, count + 10);
  const siteExcerpt = await fetchSiteContext(profile.websiteUrl);

  // Order of preference: DeepSeek on OpenRouter, then OpenAI, then Gemini.
  const attempts: Array<[BatterySource, () => Promise<string>]> = [];
  if (openrouterKey) attempts.push(["openrouter", () => generateViaOpenRouter(profile, siteExcerpt, count, openrouterKey)]);
  if (openaiKey) attempts.push(["openai", () => generateViaOpenAi(profile, siteExcerpt, count, openaiKey)]);
  if (geminiKey) attempts.push(["gemini", () => generateViaGemini(profile, siteExcerpt, count, geminiKey)]);

  for (const [source, attempt] of attempts) {
    try {
      const proposals = validateProposals(await attempt(), profile.name, cap);
      // Below this the model misfired; templates are the safer baseline.
      if (proposals.length >= 10) return { proposals, source };
    } catch (error) {
      console.warn(`[battery:${source}]`, (error as Error).message);
    }
  }

  return { proposals: suggestPromptBattery(profile), source: "templates" };
}
