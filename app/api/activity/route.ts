import { handleError, ok, requireApiSession } from "@/lib/api";
import { getRepository } from "@/lib/repositories";

/** GET /api/activity?limit=50&entityId=review-0001 */
export async function GET(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  try {
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 200)
      : 50;
    const entityId = url.searchParams.get("entityId") ?? undefined;

    const repo = await getRepository();
    const entries = await repo.listActivity({ limit, entityId });
    return ok({ entries, count: entries.length });
  } catch (error) {
    return handleError(error);
  }
}
