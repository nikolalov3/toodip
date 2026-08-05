import "server-only";

import { riskLevelFromScore } from "@/lib/risk";
import { getRepository } from "@/lib/repositories";
import type { DashboardMetrics, ReviewWithContext } from "@/types/domain";

/** Statuses that count as "the operator finished with this one". */
const PROCESSED: ReviewWithContext["status"][] = [
  "approved",
  "published",
  "rejected",
  "archived",
];

export function computeMetrics(reviews: ReviewWithContext[]): DashboardMetrics {
  const total = reviews.length;
  const published = reviews.filter((review) => review.status === "published");

  const responseTimes = published
    .filter((review) => review.publishedAt)
    .map(
      (review) =>
        (new Date(review.publishedAt as string).getTime() -
          new Date(review.reviewedAt).getTime()) /
        3_600_000,
    )
    .filter((hours) => hours >= 0);

  const sentimentSplit = { positive: 0, neutral: 0, mixed: 0, negative: 0 };
  const starSplit = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
    1 | 2 | 3 | 4 | 5,
    number
  >;

  for (const review of reviews) {
    if (review.sentiment) sentimentSplit[review.sentiment] += 1;
    const stars = review.stars as 1 | 2 | 3 | 4 | 5;
    if (starSplit[stars] !== undefined) starSplit[stars] += 1;
  }

  const averageRating = total
    ? reviews.reduce((sum, review) => sum + review.stars, 0) / total
    : 0;

  return {
    totalReviews: total,
    processedReviews: reviews.filter((review) =>
      PROCESSED.includes(review.status),
    ).length,
    pendingApprovals: reviews.filter(
      (review) => review.status === "pending_approval",
    ).length,
    responseRate: total ? published.length / total : 0,
    averageResponseHours: responseTimes.length
      ? responseTimes.reduce((sum, hours) => sum + hours, 0) /
        responseTimes.length
      : null,
    averageRating,
    sentimentSplit,
    starSplit,
    highRiskCount: reviews.filter(
      (review) => riskLevelFromScore(review.riskScore) === "high",
    ).length,
    awaitingGeneration: reviews.filter(
      (review) => review.status === "new" && review.drafts.length === 0,
    ).length,
  };
}

export async function getDashboardData() {
  const repo = await getRepository();
  const [reviews, activity, profile, tenant, members] = await Promise.all([
    repo.listReviews(),
    repo.listActivity({ limit: 8 }),
    repo.getBusinessProfile(),
    repo.getTenant(),
    repo.listMembers(),
  ]);

  const metrics = computeMetrics(reviews);

  return {
    metrics,
    activity,
    profile,
    tenant,
    members,
    queue: reviews
      .filter(
        (review) =>
          review.status === "pending_approval" ||
          (review.requiresApproval && review.status !== "published"),
      )
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5),
    recentDrafts: reviews
      .filter((review) => review.drafts.length > 0)
      .sort((a, b) =>
        (b.drafts[0]?.createdAt ?? "").localeCompare(a.drafts[0]?.createdAt ?? ""),
      )
      .slice(0, 4),
    highRisk: reviews
      .filter((review) => riskLevelFromScore(review.riskScore) === "high")
      .filter((review) => review.status !== "published")
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 4),
  };
}
