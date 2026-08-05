import type { RiskFlagType, RiskSeverity, Sentiment } from "@/types/domain";
import type { RiskLevel } from "@/types/repository";

/** Shared thresholds. The table, the queue and the badges all read from here. */
export const RISK_THRESHOLDS = {
  low: 10,
  medium: 35,
  high: 65,
} as const;

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.high) return "high";
  if (score >= RISK_THRESHOLDS.medium) return "medium";
  if (score >= RISK_THRESHOLDS.low) return "low";
  return "none";
}

export const riskLevelLabels: Record<RiskLevel, string> = {
  none: "Clear",
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Weight each flag contributes to the review risk score. */
export const RISK_FLAG_WEIGHTS: Record<RiskFlagType, number> = {
  legal_threat: 45,
  health_safety: 42,
  refund_issue: 28,
  offensive_language: 24,
  staff_named: 22,
  likely_fake: 20,
  complaint: 18,
  competitor_mention: 14,
  unclear_sentiment: 8,
};

export const SEVERITY_MULTIPLIER: Record<RiskSeverity, number> = {
  low: 0.5,
  medium: 0.8,
  high: 1,
};

/** Star rating alone already carries risk, before any flag is considered. */
export const STAR_RISK_BASE: Record<number, number> = {
  1: 34,
  2: 26,
  3: 14,
  4: 4,
  5: 2,
};

export const SENTIMENT_RISK_BASE: Record<Sentiment, number> = {
  negative: 12,
  mixed: 6,
  neutral: 3,
  positive: 0,
};
