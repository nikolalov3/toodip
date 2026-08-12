import "server-only";

import { z } from "zod";

import type {
  GeneratedDraft,
  GenerationProvider,
  GenerationProviderResult,
} from "@/services/generation/types";

/**
 * Gemini reply engine.
 *
 * Same assembled prompt, same output contract as the OpenAI provider, so
 * quality scoring, storage and the audit trail are untouched. The system and
 * user messages map onto Gemini's systemInstruction and contents.
 *
 * Environment:
 *   GEMINI_API_KEY   required
 *   GEMINI_MODEL     defaults below
 */

const DEFAULT_MODEL = "gemini-2.5-flash";
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

function model(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  modelVersion?: string;
}

async function callGemini(
  body: unknown,
  apiKey: string,
): Promise<GeminiResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model()}:generateContent`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.ok) return (await response.json()) as GeminiResponse;

      const detail = await response.text();
      const retriable = response.status === 429 || response.status >= 500;
      if (retriable && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      throw new Error(`Gemini returned ${response.status}. ${detail.slice(0, 300)}`);
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      if (aborted && attempt === 0) continue;
      if (aborted) throw new Error("Gemini timed out after 30 seconds.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Gemini call failed after a retry.");
}

/** JSON mode is requested, but a model can still answer with prose. */
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
    if (fallback.length < 10) throw new Error("Gemini returned nothing usable.");
    return [
      {
        text: fallback,
        rationale: "Model replied with plain text instead of JSON.",
        keywordUsed: null,
      },
    ];
  }
}

export const geminiGenerationProvider: GenerationProvider = {
  id: "gemini",
  label: "Google Gemini",
  offline: false,
  wantsJsonMode: true,

  async generate(prompt, context): Promise<GenerationProviderResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to .env.local and to the deployment environment, or run with GENERATION_PROVIDER=mock.",
      );
    }

    const startedAt = Date.now();
    const systemText = prompt.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const userText = prompt.messages
      .filter((message) => message.role === "user")
      .map((message) => message.content)
      .join("\n\n");

    const data = await callGemini(
      {
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: Number(process.env.OPENAI_TEMPERATURE) || 0.7,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      },
      apiKey,
    );

    const content = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("");
    const drafts = parseDrafts(content, context.draftCount);

    return {
      model: data.modelVersion ?? model(),
      drafts,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? null,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? null,
      },
      latencyMs: Date.now() - startedAt,
    };
  },
};
