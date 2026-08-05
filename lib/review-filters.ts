import type {
  ReviewSource,
  ReviewStatus,
  Sentiment,
} from "@/types/domain";
import type { ReviewFilters, ReviewSort, RiskLevel } from "@/types/repository";

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Saved views. One click gets an operator to the work that matters. */
export const REVIEW_VIEWS = [
  { id: "all", label: "All reviews" },
  { id: "needs_approval", label: "Needs approval" },
  { id: "high_risk", label: "High risk" },
  { id: "no_draft", label: "No draft yet" },
  { id: "published", label: "Published" },
] as const;

export type ReviewViewId = (typeof REVIEW_VIEWS)[number]["id"];

export const SORT_OPTIONS: Array<{
  id: ReviewSort;
  label: string;
  short: string;
}> = [
  { id: "newest", label: "Newest first", short: "Newest" },
  { id: "oldest", label: "Oldest first", short: "Oldest" },
  { id: "risk", label: "Highest risk first", short: "Risk" },
  { id: "stars_asc", label: "Lowest rating first", short: "Low ★" },
  { id: "stars_desc", label: "Highest rating first", short: "High ★" },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function csv(value: string | string[] | undefined): string[] {
  const raw = first(value);
  return raw ? raw.split(",").filter(Boolean) : [];
}

export function parseView(params: RawSearchParams): ReviewViewId {
  const raw = first(params.view);
  return REVIEW_VIEWS.some((view) => view.id === raw)
    ? (raw as ReviewViewId)
    : "all";
}

export function parseReviewFilters(params: RawSearchParams): ReviewFilters {
  const view = parseView(params);
  const filters: ReviewFilters = {
    search: first(params.q),
    stars: csv(params.stars).map(Number).filter(Boolean),
    sentiments: csv(params.sentiment) as Sentiment[],
    sources: csv(params.source) as ReviewSource[],
    riskLevels: csv(params.risk) as RiskLevel[],
    sort: (first(params.sort) as ReviewSort) ?? "newest",
  };

  switch (view) {
    case "needs_approval":
      filters.statuses = ["new", "draft_generated", "pending_approval"];
      filters.approval = "required";
      break;
    case "high_risk":
      filters.riskLevels = ["high"];
      break;
    case "no_draft":
      filters.hasDrafts = "no";
      break;
    case "published":
      filters.statuses = ["published"];
      break;
    default:
      break;
  }

  const explicitStatuses = csv(params.status) as ReviewStatus[];
  if (explicitStatuses.length) filters.statuses = explicitStatuses;

  return filters;
}

function toParams(params: RawSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = first(value);
    if (single) next.set(key, single);
  }
  // The drawer key never survives a filter change.
  next.delete("review");
  return next;
}

/** Adds or removes one value inside a comma separated parameter. */
export function toggleHref(
  base: string,
  params: RawSearchParams,
  key: string,
  value: string,
): string {
  const next = toParams(params);
  const current = (next.get(key) ?? "").split(",").filter(Boolean);
  const updated = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
  if (updated.length) next.set(key, updated.join(","));
  else next.delete(key);
  const query = next.toString();
  return query ? `${base}?${query}` : base;
}

export function setHref(
  base: string,
  params: RawSearchParams,
  key: string,
  value: string | null,
): string {
  const next = toParams(params);
  if (value) next.set(key, value);
  else next.delete(key);
  const query = next.toString();
  return query ? `${base}?${query}` : base;
}

export function isActive(
  params: RawSearchParams,
  key: string,
  value: string,
): boolean {
  return csv(params[key]).includes(value);
}

export function activeFilterCount(params: RawSearchParams): number {
  return (
    csv(params.stars).length +
    csv(params.sentiment).length +
    csv(params.source).length +
    csv(params.risk).length +
    (first(params.q) ? 1 : 0)
  );
}
