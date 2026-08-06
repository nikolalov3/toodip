import { fail, handleError, ok, requireApiSession } from "@/lib/api";
import { canSeeDebugTools } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";

/**
 * GET /api/dev/supabase-check
 *
 * Reads once through every part of the repository and reports what worked, so a
 * broken migration or a missing row shows up as a named failure instead of a
 * stack trace on a random screen.
 *
 * It runs under the caller's own row level security, so it also answers the
 * question that matters after a workspace switch: what can this account
 * actually see.
 */
export async function GET() {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;
  if (!canSeeDebugTools(auth.session.role)) {
    return fail("Not available for this role.", 403);
  }

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  async function check(name: string, run: () => Promise<string>) {
    try {
      checks.push({ name, ok: true, detail: await run() });
    } catch (error) {
      checks.push({ name, ok: false, detail: (error as Error).message });
    }
  }

  try {
    const repo = await getRepository();

    await check("tenant", async () => {
      const tenant = await repo.getTenant();
      return `${tenant.name} (${tenant.slug})`;
    });

    await check("members", async () => {
      const members = await repo.listMembers();
      return `${members.length} members: ${members.map((m) => m.role).join(", ")}`;
    });

    await check("business profile", async () => {
      const profile = await repo.getBusinessProfile();
      return `${profile.name}, ${profile.city}, ${profile.bannedPhrases.length} banned phrases, emoji policy ${profile.emojiPolicy}`;
    });

    await check("keyword bank", async () => {
      const items = await repo.listKeywordItems();
      return `${items.length} phrases, ${items.filter((i) => i.active).length} active`;
    });

    await check("brand voice", async () => {
      const examples = await repo.listBrandVoiceExamples();
      return `${examples.length} examples`;
    });

    await check("reviews", async () => {
      const reviews = await repo.listReviews();
      const withDrafts = reviews.filter((r) => r.drafts.length > 0).length;
      const flagged = reviews.filter((r) => r.riskFlags.length > 0).length;
      return `${reviews.length} reviews, ${withDrafts} with drafts, ${flagged} flagged`;
    });

    await check("filters", async () => {
      const negative = await repo.listReviews({ sentiments: ["negative"] });
      const highRisk = await repo.listReviews({ riskLevels: ["high"] });
      return `negative ${negative.length}, high risk ${highRisk.length}`;
    });

    await check("activity", async () => {
      const entries = await repo.listActivity({ limit: 5 });
      return `${entries.length} recent entries`;
    });

    return ok({
      workspace: auth.session.tenantName,
      actingAs: auth.session.email,
      role: auth.session.role,
      passed: checks.filter((c) => c.ok).length,
      failed: checks.filter((c) => !c.ok).length,
      checks,
    });
  } catch (error) {
    return handleError(error);
  }
}
