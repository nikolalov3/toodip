"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canEditSettings, requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { getUserClient } from "@/lib/supabase/server";
import {
  executeVisibilityRun,
  generatePromptBattery,
  type PromptProposal,
  type RunOutcome,
} from "@/services/measurement";

/** One prompt, one execution. The browser loops and renders progress. */
export async function runVisibilityPromptAction(
  promptId: string,
): Promise<RunOutcome> {
  return executeVisibilityRun(promptId);
}

export async function finishMeasurementAction(): Promise<void> {
  await requireSession();
  revalidatePath("/visibility");
}

const proposalsSchema = z
  .array(
    z.object({
      intent: z.string().trim().min(2).max(80),
      language: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z]{2}(-[a-z]{2})?$/),
      text: z.string().trim().min(8).max(300),
      isBranded: z.boolean().default(false),
    }),
  )
  .min(1)
  .max(50);

export interface SaveBatteryResult {
  ok: boolean;
  message: string;
}

/** Saves the reviewed prompt battery for a venue that had none. */
export async function saveBatteryAction(
  proposals: unknown,
): Promise<SaveBatteryResult> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) {
    return { ok: false, message: "Only admins can configure the battery." };
  }

  const parsed = proposalsSchema.safeParse(proposals);
  if (!parsed.success) {
    return { ok: false, message: "Check the prompts, one of them is invalid." };
  }

  const supabase = await getUserClient();

  for (const proposal of parsed.data) {
    const intent = await supabase
      .from("intents")
      .upsert(
        {
          tenant_id: session.tenantId,
          name: proposal.intent,
          language: proposal.language,
          is_branded: proposal.isBranded,
        },
        { onConflict: "tenant_id,name" },
      )
      .select("id")
      .single();
    if (intent.error) return { ok: false, message: intent.error.message };

    const prompt = await supabase.from("visibility_prompts").upsert(
      {
        tenant_id: session.tenantId,
        intent_id: intent.data.id,
        text: proposal.text,
        language: proposal.language,
      },
      { onConflict: "tenant_id,text" },
    );
    if (prompt.error) return { ok: false, message: prompt.error.message };
  }

  revalidatePath("/visibility");
  return { ok: true, message: `${parsed.data.length} prompts saved.` };
}

export interface GenerateBatteryResult {
  ok: boolean;
  proposals: PromptProposal[];
  /** Which engine wrote the battery, so the UI can say so honestly. */
  source: "openai" | "gemini" | "templates";
  message?: string;
}

/**
 * The assistant proposes a battery from the workspace's own business profile.
 * Nothing is saved here — the human reviews the list and saves explicitly.
 */
export async function generateBatteryAction(): Promise<GenerateBatteryResult> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) {
    return {
      ok: false,
      proposals: [],
      source: "templates",
      message: "Only admins can configure the battery.",
    };
  }

  const profile = await requireBusinessProfile();
  const { proposals, source } = await generatePromptBattery({
    name: profile.name,
    category: profile.category,
    city: profile.city,
    district: profile.district,
    description: profile.description,
    languages: profile.languages,
    primaryLanguage: profile.primaryLanguage,
  });

  return {
    ok: true,
    proposals,
    source,
    message:
      source === "templates"
        ? "No AI key answered, so these are the standard templates."
        : undefined,
  };
}
