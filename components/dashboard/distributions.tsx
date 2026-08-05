import { sentimentLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { DashboardMetrics, Sentiment } from "@/types/domain";

const SENTIMENT_ORDER: Sentiment[] = [
  "positive",
  "neutral",
  "mixed",
  "negative",
];

const SENTIMENT_BAR: Record<Sentiment, string> = {
  positive: "bg-positive",
  neutral: "bg-chart-5",
  mixed: "bg-caution",
  negative: "bg-critical",
};

export function SentimentDistribution({
  split,
  total,
}: {
  split: DashboardMetrics["sentimentSplit"];
  total: number;
}) {
  const counted = SENTIMENT_ORDER.reduce((sum, key) => sum + split[key], 0);
  const base = counted || 1;

  return (
    <div className="px-4 py-4">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {SENTIMENT_ORDER.map((key) =>
          split[key] > 0 ? (
            <span
              key={key}
              className={cn("h-full", SENTIMENT_BAR[key])}
              style={{ width: `${(split[key] / base) * 100}%` }}
              title={`${sentimentLabels[key]}: ${split[key]}`}
            />
          ) : null,
        )}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {SENTIMENT_ORDER.map((key) => (
          <li key={key} className="flex items-center gap-2 text-xs">
            <span
              className={cn("size-2 rounded-sm", SENTIMENT_BAR[key])}
              aria-hidden
            />
            <span className="text-muted-foreground">
              {sentimentLabels[key]}
            </span>
            <span className="ml-auto text-numeric font-medium">
              {split[key]}
            </span>
          </li>
        ))}
      </ul>

      {counted < total && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {total - counted} review{total - counted === 1 ? "" : "s"} not
          classified yet.
        </p>
      )}
    </div>
  );
}

export function StarDistribution({
  split,
  total,
}: {
  split: DashboardMetrics["starSplit"];
  total: number;
}) {
  const max = Math.max(...Object.values(split), 1);

  return (
    <ul className="flex flex-col gap-2 px-4 py-4">
      {([5, 4, 3, 2, 1] as const).map((star) => (
        <li key={star} className="flex items-center gap-2.5 text-xs">
          <span className="w-6 text-numeric text-muted-foreground">
            {star}★
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "block h-full rounded-full",
                star >= 4 ? "bg-positive" : star === 3 ? "bg-caution" : "bg-critical",
              )}
              style={{ width: `${(split[star] / max) * 100}%` }}
            />
          </span>
          <span className="w-6 text-right text-numeric font-medium">
            {split[star]}
          </span>
          <span className="w-9 text-right text-muted-foreground">
            {total ? `${Math.round((split[star] / total) * 100)}%` : "0%"}
          </span>
        </li>
      ))}
    </ul>
  );
}
