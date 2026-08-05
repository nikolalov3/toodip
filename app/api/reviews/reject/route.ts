import { z } from "zod";

import { fail, handleError, ok, parseJson, requireApiSession } from "@/lib/api";
import { canApprove } from "@/lib/auth/session";
import { rejectReview } from "@/services/reviews";

const schema = z.object({
  reviewId: z.string().min(1),
  notes: z.string().trim().min(3, "Say what should change."),
});

/** POST /api/reviews/reject */
export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;
  if (!canApprove(auth.session.role)) {
    return fail("This role cannot reject replies.", 403);
  }

  const parsed = await parseJson(request, schema);
  if ("response" in parsed) return parsed.response;

  try {
    const review = await rejectReview(
      parsed.data.reviewId,
      parsed.data.notes,
      auth.session,
    );
    return ok({ review });
  } catch (error) {
    return handleError(error);
  }
}
