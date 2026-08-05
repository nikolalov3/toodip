import { fail, handleError, ok, requireApiSession } from "@/lib/api";
import { getReviewWorkspace } from "@/services/reviews";

/** GET /api/reviews/:id — the review plus everything the UI needs with it. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const workspace = await getReviewWorkspace(id);
    if (!workspace) return fail("Review not found.", 404);

    return ok({
      review: workspace.review,
      quality: workspace.quality,
      approvalReasons: workspace.approvalReasons,
      prompt: workspace.prompt.meta,
    });
  } catch (error) {
    return handleError(error);
  }
}
