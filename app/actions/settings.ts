"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canEditSettings, requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";

export interface SettingsResult {
  ok: boolean;
  message: string;
}

const lines = (value: FormDataEntryValue | null): string[] =>
  String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const businessSchema = z.object({
  name: z.string().trim().min(2, "The business needs a name."),
  category: z.enum([
    "cafe",
    "restaurant",
    "bakery",
    "bar",
    "hotel",
    "beauty",
    "clinic",
    "trades",
    "other",
  ]),
  city: z.string().trim().min(2, "City is required."),
  district: z.string().trim().optional(),
  address: z.string().trim().optional(),
  description: z
    .string()
    .trim()
    .min(20, "Describe the venue in a sentence or two. The model leans on it."),
  tone: z.enum([
    "warm_professional",
    "concise_professional",
    "friendly_casual",
    "formal",
  ]),
  emojiPolicy: z.enum(["never", "sparing", "match_reviewer"]),
  signOff: z.string().trim().max(80).optional(),
  negativePolicy: z.string().trim().min(10, "Write the rule for bad reviews."),
  escalationEmail: z.string().trim().email("Use a valid email.").or(z.literal("")),
  escalationPhone: z.string().trim().optional(),
  primaryLanguage: z.string().trim().min(2).max(5),
  autoApproveMinStars: z.coerce.number().int().min(1).max(5),
  draftsPerGeneration: z.coerce.number().int().min(1).max(3),
});

export async function updateBusinessProfileAction(
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) {
    return { ok: false, message: "Your role cannot change brand settings." };
  }

  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    city: formData.get("city"),
    district: formData.get("district") ?? "",
    address: formData.get("address") ?? "",
    description: formData.get("description"),
    tone: formData.get("tone"),
    emojiPolicy: formData.get("emojiPolicy") ?? "match_reviewer",
    signOff: formData.get("signOff") ?? "",
    negativePolicy: formData.get("negativePolicy"),
    escalationEmail: formData.get("escalationEmail") ?? "",
    escalationPhone: formData.get("escalationPhone") ?? "",
    primaryLanguage: formData.get("primaryLanguage"),
    autoApproveMinStars: formData.get("autoApproveMinStars"),
    draftsPerGeneration: formData.get("draftsPerGeneration"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  }

  const data = parsed.data;
  const repo = await getRepository();

  await repo.updateBusinessProfile({
    name: data.name,
    category: data.category,
    city: data.city,
    district: data.district || null,
    address: data.address || null,
    description: data.description,
    tone: data.tone,
    toneDescriptors: lines(formData.get("toneDescriptors")),
    emojiPolicy: data.emojiPolicy,
    signOff: data.signOff ?? "",
    negativePolicy: data.negativePolicy,
    escalationEmail: data.escalationEmail || null,
    escalationPhone: data.escalationPhone || null,
    bannedPhrases: lines(formData.get("bannedPhrases")),
    preferredWords: lines(formData.get("preferredWords")),
    doNotMention: lines(formData.get("doNotMention")),
    primaryLanguage: data.primaryLanguage,
    approvalSettings: {
      autoApproveMinStars: data.autoApproveMinStars,
      requireApprovalWhenRiskFlagged:
        formData.get("requireApprovalWhenRiskFlagged") === "on",
      draftsPerGeneration: data.draftsPerGeneration,
      requireApprovalBeforePublish:
        formData.get("requireApprovalBeforePublish") === "on",
    },
  });

  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "business_profile",
    entityId: session.tenantId,
    action: "business_profile.updated",
    metadata: { tone: data.tone },
  });

  revalidatePath("/brand");
  revalidatePath("/prompt-studio");
  return { ok: true, message: "Brand settings saved." };
}

const keywordSchema = z.array(
  z.object({
    phrase: z.string().trim().min(2),
    type: z.enum(["local", "service", "product", "brand"]),
    active: z.boolean(),
  }),
);

export async function updateKeywordBankAction(
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) {
    return { ok: false, message: "Your role cannot change the keyword bank." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, message: "The keyword list could not be read." };
  }

  const parsed = keywordSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Every phrase needs at least two characters." };
  }

  const repo = await getRepository();
  await repo.replaceKeywordItems(parsed.data);
  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "keyword_bank",
    entityId: session.tenantId,
    action: "keyword_bank.updated",
    metadata: { count: parsed.data.length },
  });

  revalidatePath("/brand");
  revalidatePath("/prompt-studio");
  return { ok: true, message: `Keyword bank saved, ${parsed.data.length} phrases.` };
}

const voiceSchema = z.array(
  z.object({
    exampleType: z.enum([
      "positive_reply",
      "neutral_reply",
      "negative_reply",
      "tone_descriptor",
      "phrase_to_prefer",
      "phrase_to_avoid",
    ]),
    content: z.string().trim().min(2),
  }),
);

export async function updateBrandVoiceAction(
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const session = await requireSession();
  if (!canEditSettings(session.role)) {
    return { ok: false, message: "Your role cannot change brand voice." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, message: "The examples could not be read." };
  }

  const parsed = voiceSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Every example needs some text." };
  }

  const repo = await getRepository();
  await repo.replaceBrandVoiceExamples(parsed.data);
  await repo.logActivity({
    actorUserId: session.userId,
    actorName: session.fullName,
    entityType: "brand_voice",
    entityId: session.tenantId,
    action: "brand_voice.updated",
    metadata: { count: parsed.data.length },
  });

  revalidatePath("/brand");
  revalidatePath("/prompt-studio");
  return { ok: true, message: "Brand voice saved." };
}
