import { z } from "zod";

import { fail, handleError, ok, parseJson, requireApiSession } from "@/lib/api";
import { canEditSettings } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";

const patchSchema = z.object({
  name: z.string().trim().min(2).optional(),
  category: z
    .enum([
      "cafe",
      "restaurant",
      "bakery",
      "bar",
      "hotel",
      "beauty",
      "clinic",
      "trades",
      "other",
    ])
    .optional(),
  city: z.string().trim().min(2).optional(),
  district: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  description: z.string().trim().min(10).optional(),
  tone: z
    .enum([
      "warm_professional",
      "concise_professional",
      "friendly_casual",
      "formal",
    ])
    .optional(),
  toneDescriptors: z.array(z.string().trim()).optional(),
  emojiPolicy: z.enum(["never", "sparing", "match_reviewer"]).optional(),
  signOff: z.string().trim().max(120).optional(),
  negativePolicy: z.string().trim().min(10).optional(),
  googleReviewUrl: z.string().url().nullable().optional(),
  escalationEmail: z.string().email().nullable().optional(),
  escalationPhone: z.string().trim().nullable().optional(),
  bannedPhrases: z.array(z.string().trim()).optional(),
  preferredWords: z.array(z.string().trim()).optional(),
  doNotMention: z.array(z.string().trim()).optional(),
  languages: z.array(z.string().trim()).optional(),
  primaryLanguage: z.string().trim().min(2).max(5).optional(),
  approvalSettings: z
    .object({
      autoApproveMinStars: z.number().int().min(1).max(5),
      requireApprovalWhenRiskFlagged: z.boolean(),
      draftsPerGeneration: z.number().int().min(1).max(3),
      requireApprovalBeforePublish: z.boolean(),
    })
    .optional(),
});

export async function GET() {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  try {
    const repo = await getRepository();
    const [profile, keywords, brandVoice] = await Promise.all([
      repo.getBusinessProfile(),
      repo.listKeywordItems(),
      repo.listBrandVoiceExamples(),
    ]);
    return ok({ profile, keywords, brandVoice });
  } catch (error) {
    return handleError(error);
  }
}

/** PATCH /api/business-profile — partial update, same rules as the UI form. */
export async function PATCH(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;
  if (!canEditSettings(auth.session.role)) {
    return fail("This role cannot change brand settings.", 403);
  }

  const parsed = await parseJson(request, patchSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const repo = await getRepository();
    const profile = await repo.updateBusinessProfile(parsed.data);
    await repo.logActivity({
      actorUserId: auth.session.userId,
      actorName: auth.session.fullName,
      entityType: "business_profile",
      entityId: profile.id,
      action: "business_profile.updated",
      metadata: { fields: Object.keys(parsed.data) },
    });
    return ok({ profile });
  } catch (error) {
    return handleError(error);
  }
}
