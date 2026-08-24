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

  for (const item of output) {
    if (item.type === "web_search_call") usedSearch = true;
    if (item.type !== "message") continue;
    for (const part of (item.content ?? []) as Array<Record<string, unknown>>) {
      if (typeof part.text === "string") text += part.text;
      for (const annotation of (part.annotations ?? []) as Array<Record<string, unknown>>) {
        if (typeof annotation.url === "string") citations.push(annotation.url);
      }
    }
  }

  return {
    text: text.trim(),
    model: (data.model as string) ?? model,
    citations: [...new Set(citations)],
    usedSearch,
  };
}

/** Pulls the venue names out of an answer, in order of appearance. */
async function extractVenues(answer: string, apiKey: string): Promise<string[]> {
  if (!answer.trim()) return [];
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
    return Array.isArray(parsed.venues)
      ? parsed.venues.filter((v): v is string => typeof v === "string").slice(0, 20)
      : [];
  } catch {
    // Extraction failing must not lose the run. The response text is stored
    // either way, so mentions can be re-extracted later.
    return [];
  }
}

export interface RunOutcome {
  ok: boolean;
  mentionedOwn: boolean;
  mentions: string[];
  citations: number;
  usedSearch: boolean;
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
    const venues = await extractVenues(answer.text, apiKey);

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
        raw: { used_search: answer.usedSearch },
      })
      .select("id")
      .single();
    if (run.error) throw new Error(run.error.message);

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
    process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim(),
  );
}

export interface BatteryProfileInput {
  name: string;
  category: string;
  city: string;
  district: string | null;
  description: string;
  languages: string[];
  primaryLanguage: string;
}

const BATTERY_INSTRUCTIONS = `You design prompt batteries for measuring how visible a local business is in AI assistant answers (the way Profound or Adobe LLM Optimizer do).

Given a business profile, write the realistic questions this business's potential customers actually type into ChatGPT or Perplexity BEFORE choosing where to go. Rules:

- 5 to 8 intents, 3 to 4 prompts each, 20 to 30 prompts total.
- An intent is one buying situation ("best X in CITY", "X near DISTRICT", one per typical use case of this category, one comparison/ranking style question).
- Prompts must sound like real people: casual, specific, sometimes with context ("I'm visiting for a weekend...", "moj budzet to..."). Vary phrasing; no two prompts near-identical.
- Category prompts must NEVER contain the business name.
- Exactly ONE intent is branded: 2-3 prompts asking about the business by name (reviews, is it worth it). Mark it "isBranded": true.
- Write prompts in the profile's languages, favoring the primary language; include English prompts if "en" is listed (tourists ask in English).
- Use the description to find niche intents customers would ask about (e.g. vegan options, dog friendly, specific services) — but only ones this business could plausibly win.
- Intent names are short English labels regardless of prompt language.

Return ONLY JSON: {"proposals": [{"intent": "...", "language": "pl", "isBranded": false, "text": "..."}, ...]}`;

function batteryUserMessage(profile: BatteryProfileInput): string {
  return JSON.stringify({
    name: profile.name,
    category: profile.category,
    city: profile.city,
    district: profile.district,
    description: profile.description.slice(0, 1500),
    languages: profile.languages,
    primaryLanguage: profile.primaryLanguage,
  });
}

async function generateViaOpenAi(
  profile: BatteryProfileInput,
  apiKey: string,
): Promise<string> {
  const data = await callOpenAi(
    "/chat/completions",
    {
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BATTERY_INSTRUCTIONS },
        { role: "user", content: batteryUserMessage(profile) },
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
          system_instruction: { parts: [{ text: BATTERY_INSTRUCTIONS }] },
          contents: [{ parts: [{ text: batteryUserMessage(profile) }] }],
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
): PromptProposal[] {
  let parsed: { proposals?: unknown };
  try {
    parsed = JSON.parse(raw) as { proposals?: unknown };
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
    if (result.length >= 50) break;
  }
  return result;
}

/** The assistant writes the battery from the profile; template fallback on failure. */
export async function generatePromptBattery(
  profile: BatteryProfileInput,
): Promise<{ proposals: PromptProposal[]; source: "openai" | "gemini" | "templates" }> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  const attempts: Array<["openai" | "gemini", () => Promise<string>]> = [];
  if (openaiKey) attempts.push(["openai", () => generateViaOpenAi(profile, openaiKey)]);
  if (geminiKey) attempts.push(["gemini", () => generateViaGemini(profile, geminiKey)]);

  for (const [source, attempt] of attempts) {
    try {
      const proposals = validateProposals(await attempt(), profile.name);
      // Below this the model misfired; templates are the safer baseline.
      if (proposals.length >= 10) return { proposals, source };
    } catch (error) {
      console.warn(`[battery:${source}]`, (error as Error).message);
    }
  }

  return { proposals: suggestPromptBattery(profile), source: "templates" };
}
