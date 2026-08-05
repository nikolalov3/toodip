import { z } from "zod";

import { fail, handleError, ok, parseJson, requireApiSession } from "@/lib/api";
import { canEditSettings } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";

const patchSchema = z.object({
  items: z.array(
    z.object({
      phrase: z.string().trim().min(2),
      type: z.enum(["local", "service", "product", "brand"]),
      active: z.boolean(),
    }),
  ),
});

export async function GET() {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  try {
    const repo = await getRepository();
    return ok({ items: await repo.listKeywordItems() });
  } catch (error) {
    return handleError(error);
  }
}

/** PATCH /api/keyword-bank — replaces the bank, keeping usage counts. */
export async function PATCH(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;
  if (!canEditSettings(auth.session.role)) {
    return fail("This role cannot change the keyword bank.", 403);
  }

  const parsed = await parseJson(request, patchSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const repo = await getRepository();
    const items = await repo.replaceKeywordItems(parsed.data.items);
    await repo.logActivity({
      actorUserId: auth.session.userId,
      actorName: auth.session.fullName,
      entityType: "keyword_bank",
      entityId: auth.session.tenantId,
      action: "keyword_bank.updated",
      metadata: { count: items.length },
    });
    return ok({ items });
  } catch (error) {
    return handleError(error);
  }
}
