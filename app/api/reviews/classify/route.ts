import { z } from "zod";

import { handleError, ok, parseJson, requireApiSession } from "@/lib/api";
import { getRepository } from "@/lib/repositories";
import { classifyReview } from "@/services/classification";
import { classifyExistingReview } from "@/services/reviews";

const schema = z.union([
  z.object({ reviewId: z.string().min(1) }),
  z.object({
    reviewText: z.string().trim().min(5),
    stars: z.number().int().min(1).max(5),
    reviewerName: z.string().nullable().optional(),
    language: z.string().min(2).max(5).optional(),
  }),
]);

/**
 * POST /api/reviews/classify
 *
 * With a reviewId it reclassifies and persists. With raw text it runs a dry
 * classification and stores nothing, which is what an ingestion pipeline wants
 * before deciding to save a review at all.
 */
export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJson(request, schema);
  if ("response" in parsed) return parsed.response;

  try {
    if ("reviewId" in parsed.data) {
      const review = await classifyExistingReview(
        parsed.data.reviewId,
        auth.session,
      );
      return ok({
        persisted: true,
        sentiment: review.sentiment,
        riskScore: review.riskScore,
        requiresApproval: review.requiresApproval,
        flags: review.riskFlags,
      });
    }

    const repo = await getRepository();
    const profile = await repo.getBusinessProfile();
    const result = classifyReview({
      reviewText: parsed.data.reviewText,
      stars: parsed.data.stars,
      reviewerName: parsed.data.reviewerName ?? null,
      language: parsed.data.language,
      approvalSettings: profile.approvalSettings,
    });

    return ok({ persisted: false, ...result });
  } catch (error) {
    return handleError(error);
  }
}
