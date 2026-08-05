import { z } from "zod";

import { fail, handleError, ok, parseJson, requireApiSession } from "@/lib/api";
import { canApprove } from "@/lib/auth/session";
import { approveReview, selectDraft } from "@/services/reviews";

const schema = z.object({
  reviewId: z.string().min(1),
  draftId: z.string().min(1).optional(),
  notes: z.string().trim().max(1000).optional(),
  publish: z.boolean().optional(),
});

/** POST /api/reviews/approve */
export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;
  if (!canApprove(auth.session.role)) {
    return fail("This role cannot approve replies.", 403);
  }

  const parsed = await parseJson(request, schema);
  if ("response" in parsed) return parsed.response;

  try {
    if (parsed.data.draftId) {
      await selectDraft(parsed.data.reviewId, parsed.data.draftId, auth.session);
    }
    const review = await approveReview(
      parsed.data.reviewId,
      { notes: parsed.data.notes, publish: parsed.data.publish },
      auth.session,
    );
    return ok({ review });
  } catch (error) {
    return handleError(error);
  }
}
