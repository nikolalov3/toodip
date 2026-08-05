import Link from "next/link";

import { ReviewSearchInput } from "@/components/reviews/search-input";
import { sentimentLabels, sourceLabels } from "@/lib/labels";
import { riskLevelLabels } from "@/lib/risk";
import {
  REVIEW_VIEWS,
  SORT_OPTIONS,
  activeFilterCount,
  isActive,
  parseView,
  setHref,
  toggleHref,
  type RawSearchParams,
} from "@/lib/review-filters";
import { cn } from "@/lib/utils";
import type { ReviewSource, Sentiment } from "@/types/domain";
import type { RiskLevel } from "@/types/repository";

const chipBase =
  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={active}
      className={cn(
        chipBase,
        active
          ? "border-brand/40 bg-brand-soft font-medium text-brand"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function ReviewFilterBar({
  basePath,
  params,
  total,
}: {
  basePath: string;
  params: RawSearchParams;
  total: number;
}) {
  const view = parseView(params);
  const filterCount = activeFilterCount(params);
  const currentSort = (params.sort as string) ?? "newest";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
        {REVIEW_VIEWS.map((item) => {
          const active = view === item.id;
          return (
            <Link
              key={item.id}
              href={setHref(basePath, params, "view", item.id === "all" ? null : item.id)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "font-medium text-foreground after:absolute after:inset-x-2.5 after:-bottom-2 after:h-px after:bg-brand"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ReviewSearchInput />

        <div className="flex flex-wrap items-center gap-1">
          {[5, 4, 3, 2, 1].map((star) => (
            <FilterChip
              key={star}
              href={toggleHref(basePath, params, "stars", String(star))}
              active={isActive(params, "stars", String(star))}
            >
              {star}★
            </FilterChip>
          ))}
        </div>

        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />

        <div className="flex flex-wrap items-center gap-1">
          {(Object.keys(sentimentLabels) as Sentiment[]).map((sentiment) => (
            <FilterChip
              key={sentiment}
              href={toggleHref(basePath, params, "sentiment", sentiment)}
              active={isActive(params, "sentiment", sentiment)}
            >
              {sentimentLabels[sentiment]}
            </FilterChip>
          ))}
        </div>

        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />

        <div className="flex flex-wrap items-center gap-1">
          {(["high", "medium", "low"] as RiskLevel[]).map((level) => (
            <FilterChip
              key={level}
              href={toggleHref(basePath, params, "risk", level)}
              active={isActive(params, "risk", level)}
            >
              {riskLevelLabels[level]} risk
            </FilterChip>
          ))}
        </div>

        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />

        <div className="flex flex-wrap items-center gap-1">
          {(["google", "tripadvisor", "facebook"] as ReviewSource[]).map(
            (source) => (
              <FilterChip
                key={source}
                href={toggleHref(basePath, params, "source", source)}
                active={isActive(params, "source", source)}
              >
                {sourceLabels[source]}
              </FilterChip>
            ),
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {filterCount > 0 && (
            <Link
              href={
                params.view ? `${basePath}?view=${params.view}` : basePath
              }
              scroll={false}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear {filterCount} filter{filterCount > 1 ? "s" : ""}
            </Link>
          )}
          <span className="text-xs text-muted-foreground">
            {total} result{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map((option) => (
              <Link
                key={option.id}
                href={setHref(
                  basePath,
                  params,
                  "sort",
                  option.id === "newest" ? null : option.id,
                )}
                scroll={false}
                title={option.label}
                className={cn(
                  "rounded-md px-1.5 py-1 text-xs transition-colors",
                  currentSort === option.id
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.short}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
