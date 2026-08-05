import { fail, handleError, ok, requireApiSession } from "@/lib/api";
import { canSeeDebugTools } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";
import { buildPrompt } from "@/prompts/builder";
import { PROMPT_VERSION } from "@/prompts/system";
import { getGenerationProviderById } from "@/services/generation";
import { evaluateDraft } from "@/services/generation/quality";

/**
 * GET /api/dev/compare-engines?providers=mock,openai&limit=6
 *
 * Runs the same reviews through several engines and scores every draft with the
 * same rules, so switching engines is a measured decision rather than a hunch.
 *
 * Platform admin only, and off in production unless ALLOW_ENGINE_COMPARE is set,
 * because a run against a paid engine costs tokens.
 */
export async function GET(request: Request) {
  const auth = await requireApiSession();
  if ("response" in auth) return auth.response;

  // Same audience as Prompt Studio: the people allowed to see how replies are made.
  if (!canSeeDebugTools(auth.session.role)) {
    return fail("Engine comparison is not available for this role.", 403);
  }
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_ENGINE_COMPARE) {
    return fail(
      "Engine comparison is disabled in production. Set ALLOW_ENGINE_COMPARE=1 to allow it.",
      403,
    );
  }

  try {
    const url = new URL(request.url);
    const ids = (url.searchParams.get("providers") ?? "mock,openai")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const limitParam = Number(url.searchParams.get("limit") ?? 6);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 20)
      : 6;

    const repo = await getRepository();
    const [profile, keywords, brandVoice] = await Promise.all([
      repo.getBusinessProfile(),
      repo.listKeywordItems(),
      repo.listBrandVoiceExamples(),
    ]);

    // Highest risk first: those are the replies worth judging an engine on.
    const reviews = (await repo.listReviews({ sort: "risk" })).slice(0, limit);

    const totals = new Map<
      string,
      { scores: number[]; issues: number; latency: number; failures: number }
    >();

    const rows = [];

    for (const review of reviews) {
      const results: Record<string, unknown> = {};

      for (const id of ids) {
        const provider = getGenerationProviderById(id);
        if (!provider) {
          results[id] = { error: `Unknown engine "${id}".` };
          continue;
        }

        const bucket = totals.get(id) ?? {
          scores: [],
          issues: 0,
          latency: 0,
          failures: 0,
        };
        totals.set(id, bucket);

        const prompt = buildPrompt({
          review,
          profile,
          keywords,
          brandVoice,
          // One draft per engine keeps the comparison honest and the cost low.
          draftCount: 1,
          jsonMode: provider.wantsJsonMode ?? false,
        });

        try {
          const output = await provider.generate(prompt, {
            review,
            profile,
            keywords,
            brandVoice,
            draftCount: 1,
            previousDrafts: [],
          });

          const draft = output.drafts[0];
          const quality = evaluateDraft({
            text: draft.text,
            review,
            profile,
            keywords,
          });

          bucket.scores.push(quality.score);
          bucket.issues += quality.issues.length;
          bucket.latency += output.latencyMs;

          results[id] = {
            text: draft.text,
            score: quality.score,
            issues: quality.issues,
            safetyTags: quality.safetyTags,
            keywordUsed: draft.keywordUsed,
            latencyMs: output.latencyMs,
            usage: output.usage,
          };
        } catch (error) {
          bucket.failures += 1;
          results[id] = { error: (error as Error).message };
        }
      }

      rows.push({
        reviewId: review.id,
        reviewer: review.reviewerName ?? "Anonymous",
        stars: review.stars,
        language: review.language,
        sentiment: review.sentiment,
        riskScore: review.riskScore,
        riskFlags: review.riskFlags.map((flag) => flag.flagType),
        results,
      });
    }

    const summary = Object.fromEntries(
      [...totals.entries()].map(([id, bucket]) => [
        id,
        {
          reviews: bucket.scores.length,
          failures: bucket.failures,
          averageScore: bucket.scores.length
            ? Number(
                (
                  bucket.scores.reduce((sum, score) => sum + score, 0) /
                  bucket.scores.length
                ).toFixed(1),
              )
            : null,
          perfectScores: bucket.scores.filter((score) => score === 100).length,
          issuesTotal: bucket.issues,
          averageLatencyMs: bucket.scores.length
            ? Math.round(bucket.latency / bucket.scores.length)
            : null,
        },
      ]),
    );

    return ok({ promptVersion: PROMPT_VERSION, summary, rows });
  } catch (error) {
    return handleError(error);
  }
}
