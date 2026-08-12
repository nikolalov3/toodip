import "server-only";

import { canEditSettings, requireSession } from "@/lib/auth/session";
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

  // Each run is a web_search call, the most expensive request in the app. Free
  // workspaces see the screens; the API bill starts with a paid plan.
  const billing = await getBillingSnapshot();
  if (!billing.allowAi) {
    return {
      ok: false,
      mentionedOwn: false,
      mentions: [],
      citations: 0,
      usedSearch: false,
      error: "Visibility measurements need a paid plan. Upgrade on the Billing page.",
    };
  }

  const supabase = await getUserClient();

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
 * Template based prompt proposals for a venue that has no battery yet.
 * Deterministic on purpose: no API cost, no Warsaw-for-Krakow surprises, and
 * the human still reviews every line before anything is saved.
 */
export interface PromptProposal {
  intent: string;
  language: "pl" | "en";
  text: string;
}

export function suggestPromptBattery(profile: {
  category: string;
  city: string;
  district: string | null;
}): PromptProposal[] {
  const city = profile.city;
  const district = profile.district;
  const kindPl = profile.category === "restaurant" ? "restauracja" : "kawiarnia";
  const kindPlGen = profile.category === "restaurant" ? "restauracji" : "kawiarni";
  const kindEn = profile.category === "restaurant" ? "restaurant" : "cafe";

  const proposals: PromptProposal[] = [
    { intent: `Best ${kindEn} in ${city}`, language: "pl", text: `Jaka jest najlepsza ${kindPl} w ${city}?` },
    { intent: `Best ${kindEn} in ${city}`, language: "pl", text: `Polecacie jakąś dobrą ${kindPlGen.replace("kawiarni", "kawiarnię")} w ${city}?` },
    { intent: `Best ${kindEn} in ${city}`, language: "en", text: `Best ${kindEn} in ${city}?` },
    { intent: "Laptop friendly", language: "pl", text: `Gdzie w ${city} można popracować z laptopem w ${kindPlGen}?` },
    { intent: "Laptop friendly", language: "en", text: `Good ${kindEn} to work from with a laptop in ${city}?` },
    { intent: "Breakfast", language: "pl", text: `Gdzie na dobre śniadanie w ${city}?` },
    { intent: "Breakfast", language: "en", text: `Where to get a good breakfast in ${city}?` },
  ];

  if (district) {
    proposals.push(
      { intent: `District: ${district}`, language: "pl", text: `Jaka jest dobra ${kindPl} na ${district}u albo w okolicy?` },
      { intent: `District: ${district}`, language: "pl", text: `Gdzie na kawę w okolicy ${district}a w ${city}?` },
      { intent: `District: ${district}`, language: "en", text: `Where should I go for coffee near ${district} in ${city}?` },
    );
  }

  return proposals;
}
