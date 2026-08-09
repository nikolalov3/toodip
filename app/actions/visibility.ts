"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canEditSettings, requireSession } from "@/lib/auth/session";
import { getUserClient } from "@/lib/supabase/server";
import { executeVisibilityRun, type RunOutcome } from "@/services/measurement";

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
      language: z.enum(["pl", "en"]),
      text: z.string().trim().min(8).max(300),
    }),
  )
  .min(1)
  .max(40);

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
          is_branded: false,
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
