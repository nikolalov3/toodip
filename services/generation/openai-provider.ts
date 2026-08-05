import { z } from "zod";

import type {
  GeneratedDraft,
  GenerationProvider,
  GenerationProviderResult,
} from "@/services/generation/types";

/**
 * OpenAI reply engine.
 *
 * It receives the same assembled prompt the mock engine gets and returns the
 * same shape, so quality scoring, storage, status transitions and the audit
 * trail are untouched. The API key is read from the environment and never
 * leaves the server.
 *
 * Environment:
 *   OPENAI_API_KEY      required
 *   OPENAI_MODEL        defaults below, set it to whatever your account lists
 *   OPENAI_BASE_URL     for a proxy or a compatible endpoint
 *   OPENAI_TEMPERATURE  defaults to 0.7, lower it for more predictable replies
 */

const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const TIMEOUT_MS = 30_000;

const responseSchema = z.object({
  drafts: z
    .array(
      z.object({
        text: z.string().trim().min(10),
        rationale: z.string().trim().default("No rationale returned."),
        keywordUsed: z.string().trim().nullable().default(null),
      }),
    )
    .min(1),
});

interface ChatCompletion {
  choices: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function model(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

function temperature(): number {
  const raw = Number(process.env.OPENAI_TEMPERATURE);
  return Number.isFinite(raw) ? raw : 0.7;
}

/** Retries once on rate limits and server errors, which are the transient ones. */
async function callOpenAi(body: unknown, apiKey: string): Promise<ChatCompletion> {
  const url = `${process.env.OPENAI_BASE_URL?.replace(/\/$/, "") || DEFAULT_BASE_URL}/chat/completions`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.ok) return (await response.json()) as ChatCompletion;

      const detail = await response.text();
      const retriable = response.status === 429 || response.status >= 500;
      if (retriable && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      throw new Error(
        `OpenAI returned ${response.status}. ${detail.slice(0, 300)}`,
      );
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      if (aborted && attempt === 0) continue;
      if (aborted) throw new Error("OpenAI timed out after 30 seconds.");
      if (attempt === 1) throw error;
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("OpenAI call failed after a retry.");
}

/** JSON mode is requested, but a model can still answer with plain text. */
function parseDrafts(content: string, draftCount: number): GeneratedDraft[] {
  try {
    const parsed = responseSchema.parse(JSON.parse(content));
    return parsed.drafts.slice(0, draftCount).map((draft) => ({
      text: draft.text,
      rationale: draft.rationale,
      keywordUsed: draft.keywordUsed,
    }));
  } catch {
    const fallback = content.trim().replace(/^```(?:json)?|```$/g, "").trim();
    if (fallback.length < 10) {
      throw new Error("OpenAI returned nothing usable.");
    }
    return [
      {
        text: fallback,
        rationale: "Model replied with plain text instead of JSON.",
        keywordUsed: null,
      },
    ];
  }
}

export const openAiGenerationProvider: GenerationProvider = {
  id: "openai",
  label: "OpenAI",
  offline: false,
  wantsJsonMode: true,

  async generate(prompt, context): Promise<GenerationProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local and to the Vercel project, or run with GENERATION_PROVIDER=mock.",
      );
    }

    const startedAt = Date.now();
    const completion = await callOpenAi(
      {
        model: model(),
        messages: prompt.messages,
        temperature: temperature(),
        // Enough for three replies plus the rationale, and a hard ceiling on cost.
        max_tokens: 900,
        response_format: { type: "json_object" },
      },
      apiKey,
    );

    const content = completion.choices?.[0]?.message?.content ?? "";
    const drafts = parseDrafts(content, context.draftCount);

    return {
      model: model(),
      drafts,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? null,
        completionTokens: completion.usage?.completion_tokens ?? null,
      },
      latencyMs: Date.now() - startedAt,
    };
  },
};
