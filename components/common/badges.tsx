import { Star } from "lucide-react";

import {
  riskFlagGuidance,
  riskFlagLabels,
  sentimentLabels,
  sourceLabels,
  statusDescriptions,
  statusLabels,
} from "@/lib/labels";
import { riskLevelFromScore, riskLevelLabels } from "@/lib/risk";
import { cn } from "@/lib/utils";
import type {
  ReviewRiskFlag,
  ReviewSource,
  ReviewStatus,
  RiskSeverity,
  Sentiment,
} from "@/types/domain";
import type { RiskLevel } from "@/types/repository";

const chip =
  "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap";

const STATUS_STYLES: Record<ReviewStatus, { dot: string; text: string }> = {
  new: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
  draft_generated: { dot: "bg-info", text: "text-info" },
  pending_approval: { dot: "bg-caution", text: "text-caution" },
  approved: { dot: "bg-positive", text: "text-positive" },
  rejected: { dot: "bg-critical", text: "text-critical" },
  published: { dot: "bg-positive", text: "text-positive" },
  archived: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ReviewStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(chip, "border-border bg-card", style.text, className)}
      title={statusDescriptions[status]}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
      {statusLabels[status]}
    </span>
  );
}

const SENTIMENT_STYLES: Record<Sentiment, string> = {
  positive: "border-positive/30 bg-positive-soft text-positive",
  neutral: "border-border bg-muted text-muted-foreground",
  mixed: "border-caution/30 bg-caution-soft text-caution",
  negative: "border-critical/30 bg-critical-soft text-critical",
};

export function SentimentBadge({
  sentiment,
  className,
}: {
  sentiment: Sentiment | null;
  className?: string;
}) {
  if (!sentiment) {
    return (
      <span className={cn(chip, "border-dashed border-border text-muted-foreground", className)}>
        Not classified
      </span>
    );
  }
  return (
    <span className={cn(chip, SENTIMENT_STYLES[sentiment], className)}>
      {sentimentLabels[sentiment]}
    </span>
  );
}

const RISK_STYLES: Record<RiskLevel, string> = {
  none: "border-border bg-card text-muted-foreground",
  low: "border-border bg-card text-muted-foreground",
  medium: "border-caution/30 bg-caution-soft text-caution",
  high: "border-critical/30 bg-critical-soft text-critical",
};

export function RiskBadge({
  score,
  showScore = true,
  className,
}: {
  score: number;
  showScore?: boolean;
  className?: string;
}) {
  const level = riskLevelFromScore(score);
  return (
    <span
      className={cn(chip, RISK_STYLES[level], className)}
      title={`Risk score ${score} of 100`}
    >
      {riskLevelLabels[level]}
      {showScore && (
        <span className="text-numeric opacity-70">{score}</span>
      )}
    </span>
  );
}

const SEVERITY_STYLES: Record<RiskSeverity, string> = {
  low: "border-border bg-muted text-muted-foreground",
  medium: "border-caution/30 bg-caution-soft text-caution",
  high: "border-critical/30 bg-critical-soft text-critical",
};

export function RiskFlagChip({
  flag,
  className,
}: {
  flag: Pick<ReviewRiskFlag, "flagType" | "severity">;
  className?: string;
}) {
  return (
    <span
      className={cn(chip, SEVERITY_STYLES[flag.severity], className)}
      title={riskFlagGuidance[flag.flagType]}
    >
      {riskFlagLabels[flag.flagType]}
    </span>
  );
}

export function SourceBadge({ source }: { source: ReviewSource }) {
  return (
    <span className="text-xs text-muted-foreground">{sourceLabels[source]}</span>
  );
}

export function StarRating({
  stars,
  size = 14,
  className,
}: {
  stars: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${stars} out of 5 stars`}
      title={`${stars} of 5`}
    >
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          width={size}
          height={size}
          aria-hidden
          className={cn(
            index <= stars
              ? "fill-caution text-caution"
              : "fill-transparent text-border",
          )}
        />
      ))}
    </span>
  );
}

export function QualityScore({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const tone =
    score >= 80 ? "text-positive" : score >= 60 ? "text-caution" : "text-critical";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", className)}
      title="Rule based quality score, 0 to 100"
    >
      <span className="h-1 w-10 overflow-hidden rounded-full bg-muted">
        <span
          className={cn(
            "block h-full rounded-full",
            score >= 80 ? "bg-positive" : score >= 60 ? "bg-caution" : "bg-critical",
          )}
          style={{ width: `${score}%` }}
        />
      </span>
      <span className={cn("text-numeric font-medium", tone)}>{score}</span>
    </span>
  );
}
