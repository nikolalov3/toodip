import { z } from "zod";

import { fail, handleError, ok, parseJson, requireApiSession } from "@/lib/api";
import { parseReviewFilters, type RawSearchParams } from "@/lib/review-filters";
import { ingestReview, listReviews } from "@/services/reviews";

/** GET /api/reviews — same filters the reviews screen uses. */
export async function GET(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  try {
    const url = new URL(request.url);
    const params: RawSearchParams = Object.fromEntries(
      url.searchParams.entries(),
    );
    const reviews = await listReviews(parseReviewFilters(params));
    return ok({ reviews, count: reviews.length });
  } catch (error) {
    return handleError(error);
  }
}

const createSchema = z.object({
  source: z.enum(["google", "facebook", "tripadvisor", "booking", "manual"]),
  reviewerName: z.string().trim().max(120).nullable().optional(),
  stars: z.number().int().min(1).max(5),
  reviewText: z.string().trim().min(5),
  language: z.string().trim().min(2).max(5).optional(),
  reviewedAt: z.string().datetime().optional(),
});

/** POST /api/reviews — ingest one review and triage it immediately. */
export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJson(request, createSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const review = await ingestReview(
      {
        source: parsed.data.source,
        reviewerName: parsed.data.reviewerName ?? null,
        stars: parsed.data.stars,
        reviewText: parsed.data.reviewText,
        language: parsed.data.language,
        reviewedAt: parsed.data.reviewedAt,
      },
      auth.session,
    );
    return ok({ review }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT() {
  return fail("Use POST to create a review.", 405);
}
