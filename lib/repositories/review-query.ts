import { riskLevelFromScore } from "@/lib/risk";
import type { Review, ReviewWithContext } from "@/types/domain";
import type { ReviewFilters, ReviewSort } from "@/types/repository";

/**
 * Filter and sort semantics for the reviews list, shared by every persistence
 * adapter.
 *
 * The Supabase adapter pushes what it can into the query for speed and then
 * runs these anyway. That is deliberate: the promise of the repository
 * interface is that both adapters return the same rows in the same order, and
 * the cheapest way to keep that promise is to have one implementation of the
 * rules rather than two that drift.
 */

export function matchesSearch(review: Review, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return (
    review.reviewText.toLowerCase().includes(needle) ||
    (review.reviewerName ?? "").toLowerCase().includes(needle)
  );
}

export function matchesFilters(
  review: ReviewWithContext,
  filters: ReviewFilters,
): boolean {
  if (filters.search && !matchesSearch(review, filters.search)) return false;
  if (filters.stars?.length && !filters.stars.includes(review.stars)) {
    return false;
  }
  if (filters.statuses?.length && !filters.statuses.includes(review.status)) {
    return false;
  }
  if (
    filters.sentiments?.length &&
    (!review.sentiment || !filters.sentiments.includes(review.sentiment))
  ) {
    return false;
  }
  if (filters.sources?.length && !filters.sources.includes(review.source)) {
    return false;
  }
  if (
    filters.riskLevels?.length &&
    !filters.riskLevels.includes(riskLevelFromScore(review.riskScore))
  ) {
    return false;
  }
  if (filters.hasDrafts === "yes" && review.drafts.length === 0) return false;
  if (filters.hasDrafts === "no" && review.drafts.length > 0) return false;
  if (filters.approval === "required" && !review.requiresApproval) return false;
  if (filters.approval === "not_required" && review.requiresApproval) {
    return false;
  }
  if (filters.assignedTo && review.assignedTo !== filters.assignedTo) {
    return false;
  }
  return true;
}

export function sortReviews<T extends ReviewWithContext>(
  reviews: T[],
  sort: ReviewSort = "newest",
): T[] {
  return [...reviews].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.reviewedAt.localeCompare(b.reviewedAt);
      case "risk":
        return b.riskScore - a.riskScore;
      case "stars_asc":
        return a.stars - b.stars || b.reviewedAt.localeCompare(a.reviewedAt);
      case "stars_desc":
        return b.stars - a.stars || b.reviewedAt.localeCompare(a.reviewedAt);
      default:
        return b.reviewedAt.localeCompare(a.reviewedAt);
    }
  });
}

/** Newest first. Both adapters order drafts and approvals this way. */
export function newestFirst<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
