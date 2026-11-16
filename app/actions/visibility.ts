"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canEditSettings, requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { PLANS } from "@/lib/billing";
import { checkSharedRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getUserClient } from "@/lib/supabase/server";
import { getBillingSnapshot } from "@/services/billing";
import { classifyQuestionIntents } from "@/services/measurement";
import {
  executeVisibilityRun,
  generatePromptBattery,
  type BatterySource,
  type PromptProposal,
  type RunOutcome,
} from "@/services/measurement";
import { gscConfigured } from "@/lib/google/search-console";
import { getServiceClient } from "@/lib/supabase/server";
import { writeAnalystNote, type AnalystNote } from "@/services/analyst";
import { syncSearchConsole } from "@/services/gsc";
import { getStatsSnapshot } from "@/services/stats";
import { logIntervention } from "@/services/visibility";

/** Every AI Visibility tab and the report read the same ledger; all of them go stale together. */
function refreshVisibility(): void {
  revalidatePath("/visibility", "layout");
  revalidatePath("/report");
}

const propertySchema = z
  .string()
  .trim()
  .regex(/^(sc-domain:[a-z0-9.-]+|https?:\/\/[a-z0-9.-]+(?::\d+)?\/[^\s]*)$/i, "Use the property exactly as Search Console names it.");

/**
 * Connects a Search Console property: stores it for the workspace and pulls
 * the first 90 days right away when the service account already has access.
 */
export async function connectSearchConsoleAction(input: unknown): Promise<{ ok: boolean; message: string }> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) return { ok: false, message: "Only an admin can connect Search Console." };
  const parsed = propertySchema.safeParse(typeof input === "object" && input ? (input as { siteUrl?: unknown }).siteUrl : input);
  if (!parsed.success) return { ok: false, message: "Use the property exactly as Search Console names it: sc-domain:example.com or https://example.com/." };
  const siteUrl = parsed.data;
  const supabase = await getUserClient();
  const saved = await supabase
    .from("gsc_properties")
    .upsert({ tenant_id: session.tenantId, site_url: siteUrl, last_synced_on: null, last_error: null }, { onConflict: "tenant_id" });
  if (saved.error) {
    const missing = /does not exist|schema cache/i.test(saved.error.message);
    return {
      ok: false,
      message: missing ? "Search Console tables are missing: apply supabase/migrations/20261109120000_analyst_and_gsc.sql." : saved.error.message,
    };
  }
  if (!gscConfigured()) {
    refreshVisibility();
    return { ok: true, message: "Property saved. The daily sync starts once the server has a Search Console service account." };
  }
  try {
    const synced = await syncSearchConsole(getServiceClient(), session.tenantId, siteUrl, null);
    refreshVisibility();
    return { ok: true, message: `Connected. ${synced.rows} rows loaded for ${synced.from} to ${synced.to}.` };
  } catch (error) {
    refreshVisibility();
    return {
      ok: true,
      message: `Property saved, but the first sync failed: ${(error as Error).message.slice(0, 200)}. Check that the service account was added as a user of the property; the daily sync retries.`,
    };
  }
}

/**
 * Writes the analyst note for the latest measurement on request. Admins only:
 * each note is a model call paid by the platform.
 */
export async function writeAnalystNoteAction(series?: string): Promise<{ ok: boolean; message: string; note?: AnalystNote }> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) return { ok: false, message: "Only an admin can write the note." };
  const supabase = await getUserClient();
  const allowed = await checkSharedRateLimit(supabase, rateLimitKey("analyst", session.tenantId), 6, 60 * 60);
  if (!allowed) return { ok: false, message: "Six notes an hour is the limit for one workspace. Try later." };
  const traffic = await getStatsSnapshot().catch(() => null);
  const result = await writeAnalystNote(supabase, session.tenantId, {
    createdBy: "panel",
    series: typeof series === "string" ? series.slice(0, 120) : null,
    traffic: traffic?.site ? { days: traffic.days, pageviews: traffic.pageviews, fromAi: traffic.fromAi } : null,
  });
  if (result.ok) refreshVisibility();
  return { ok: result.ok, message: result.ok ? "Note written." : (result.message ?? "Could not write the note."), note: result.note };
}

const interventionSchema = z.object({
  kind: z.enum(["record_update", "review_reply", "site_change", "guide_entry", "social_post", "other"]),
  surface: z.enum(["google", "site", "instagram", "facebook", "guide", "other"]),
  description: z.string().trim().min(3).max(500),
  performedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * The owner logs what they changed (a Google record update, a new page, a
 * guide listing) so the next measurement can be read against it. Any member
 * of the workspace may log; the ledger is append-only.
 */
export async function logInterventionAction(input: unknown): Promise<{ ok: boolean; message: string }> {
  await requireSession();
  const parsed = interventionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Pick what changed and where, give it a date and a short description." };
  }
  const result = await logIntervention(parsed.data);
  if (!result.ok) return { ok: false, message: result.message ?? "Could not save the change." };
  refreshVisibility();
  return { ok: true, message: "Logged. The next measurement will show the score before and after it." };
}

/** One prompt, one execution on one assistant. The browser loops and renders progress. */
export async function runVisibilityPromptAction(
  promptId: string,
  assistant?: string,
): Promise<RunOutcome> {
  return executeVisibilityRun(promptId, assistant === "google" ? "google" : "chatgpt");
}

export async function finishMeasurementAction(): Promise<void> {
  await requireSession();
  refreshVisibility();
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
  .max(120);

export interface SaveBatteryResult {
  ok: boolean;
  message: string;
}

/**
 * Saves the reviewed prompt battery. With `replace`, questions not in the
 * list are deactivated (never deleted: their runs stay in the ledger), so an
 * edit is exactly what the table shows.
 */
export async function saveBatteryAction(
  proposals: unknown,
  options?: { replace?: boolean },
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
        active: true,
      },
      { onConflict: "tenant_id,text" },
    );
    if (prompt.error) return { ok: false, message: prompt.error.message };
  }

  if (options?.replace) {
    const keep = new Set(parsed.data.map((p) => p.text));
    const active = await supabase
      .from("visibility_prompts")
      .select("id, text")
      .eq("tenant_id", session.tenantId)
      .eq("active", true)
      .limit(1000);
    const retire = ((active.data ?? []) as Array<{ id: string; text: string }>)
      .filter((row) => !keep.has(row.text))
      .map((row) => row.id);
    if (retire.length) {
      const retired = await supabase
        .from("visibility_prompts")
        .update({ active: false })
        .in("id", retire);
      if (retired.error) return { ok: false, message: retired.error.message };
    }
  }

  refreshVisibility();
  return { ok: true, message: `${parsed.data.length} prompts saved.` };
}

export interface GenerateBatteryResult {
  ok: boolean;
  proposals: PromptProposal[];
  /** Which engine wrote the battery, so the UI can say so honestly. */
  source: BatterySource;
  message?: string;
}

const generateInputSchema = z.object({
  websiteUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => (value ? value : undefined)),
  count: z.number().int().min(10).max(100).default(50),
});

/**
 * The assistant proposes a battery from the workspace's own business profile,
 * plus the client's website when given. Nothing is saved here — the human
 * reviews and edits the list, then saves explicitly.
 */
export async function generateBatteryAction(
  input?: unknown,
): Promise<GenerateBatteryResult> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) {
    return {
      ok: false,
      proposals: [],
      source: "templates",
      message: "Only admins can configure the battery.",
    };
  }

  const options = generateInputSchema.safeParse(input ?? {});
  if (!options.success) {
    return {
      ok: false,
      proposals: [],
      source: "templates",
      message: "Check the website address and the number of questions.",
    };
  }

  // The generator calls a paid model, so it is for plans that measure, and at
  // a pace no human would exceed.
  const billing = await getBillingSnapshot();
  if (PLANS[billing.effectivePlan].monthlyRuns <= 0) {
    return {
      ok: false,
      proposals: [],
      source: "templates",
      message: "The question battery is part of the Visibility plan. Upgrade on the Billing page.",
    };
  }
  const allowed = await checkSharedRateLimit(
    await getUserClient(),
    rateLimitKey("battery", session.tenantId),
    10,
    3600,
  );
  if (!allowed) {
    return {
      ok: false,
      proposals: [],
      source: "templates",
      message: "That is enough generations for this hour. Edit the list you have, or try again later.",
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
    websiteUrl: options.data.websiteUrl,
    targetCount: options.data.count,
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

/**
 * Re-labels the active battery with AI intents. Intents are upserted by name,
 * every active prompt is pointed at its new intent, and intents left without
 * prompts are deactivated. Past runs keep their rows; they simply report under
 * the new label from now on.
 */
export async function regroupIntentsAction(): Promise<{ ok: boolean; message: string }> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) return { ok: false, message: "Only admins can regroup the battery." };
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return { ok: false, message: "OPENROUTER_API_KEY is not set on the server." };

  const supabase = await getUserClient();
  const allowed = await checkSharedRateLimit(supabase, rateLimitKey("regroup", session.tenantId), 6, 3600);
  if (!allowed) return { ok: false, message: "That is enough regrouping for this hour." };

  const profile = await requireBusinessProfile();
  const promptsResult = await supabase
    .from("visibility_prompts")
    .select("id, text, language")
    .eq("tenant_id", session.tenantId)
    .eq("active", true)
    .limit(500);
  const prompts = (promptsResult.data ?? []) as Array<{ id: string; text: string; language: string }>;
  if (prompts.length === 0) return { ok: false, message: "No active questions to group." };

  let assignments;
  try {
    assignments = await classifyQuestionIntents(
      prompts.map((p) => p.text),
      { name: profile.name, category: profile.category, city: profile.city },
      apiKey,
    );
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }

  const byText = new Map(assignments.map((a) => [a.text, a]));
  const intentIds = new Map<string, string>();
  for (const prompt of prompts) {
    const a = byText.get(prompt.text.trim());
    if (!a) continue;
    if (!intentIds.has(a.intent)) {
      const intent = await supabase
        .from("intents")
        .upsert(
          { tenant_id: session.tenantId, name: a.intent, language: prompt.language ?? "pl", is_branded: a.isBranded, active: true },
          { onConflict: "tenant_id,name" },
        )
        .select("id")
        .single();
      if (intent.error) return { ok: false, message: intent.error.message };
      intentIds.set(a.intent, intent.data.id as string);
    }
    const moved = await supabase
      .from("visibility_prompts")
      .update({ intent_id: intentIds.get(a.intent) })
      .eq("id", prompt.id);
    if (moved.error) return { ok: false, message: moved.error.message };
  }

  // Intents nobody points at any more go quiet.
  const stillUsed = [...intentIds.values()];
  if (stillUsed.length) {
    await supabase
      .from("intents")
      .update({ active: false })
      .eq("tenant_id", session.tenantId)
      .not("id", "in", `(${stillUsed.join(",")})`);
  }

  refreshVisibility();
  return { ok: true, message: `${prompts.length} questions grouped into ${intentIds.size} intents.` };
}
