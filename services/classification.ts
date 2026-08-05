import {
  RISK_FLAG_WEIGHTS,
  SENTIMENT_RISK_BASE,
  SEVERITY_MULTIPLIER,
  STAR_RISK_BASE,
} from "@/lib/risk";
import type {
  ApprovalSettings,
  ReviewRiskFlag,
  RiskFlagType,
  RiskSeverity,
  Sentiment,
} from "@/types/domain";

/**
 * Deterministic review triage.
 *
 * Runs before any model call, on the server, in under a millisecond. It decides
 * sentiment, risk flags and whether a human must sign the reply off. Keeping
 * this rule based rather than model based is intentional: the approval gate has
 * to behave the same way every single time, and it has to work when the model
 * is down.
 */

export interface ClassificationInput {
  reviewText: string;
  stars: number;
  language?: string;
  reviewerName?: string | null;
  approvalSettings: ApprovalSettings;
}

export interface ClassificationResult {
  sentiment: Sentiment;
  language: string;
  riskScore: number;
  requiresApproval: boolean;
  flags: Array<Omit<ReviewRiskFlag, "id" | "reviewId" | "createdAt">>;
  reasons: string[];
}

/** Lowercases and strips Polish diacritics so one pattern covers both spellings. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    // Combining diacritical marks, so "ę" and "e" hit the same pattern.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLowerCase();
}

interface FlagRule {
  flagType: RiskFlagType;
  severity: RiskSeverity;
  patterns: RegExp[];
}

const FLAG_RULES: FlagRule[] = [
  {
    flagType: "legal_threat",
    severity: "high",
    patterns: [
      /sanepid|inspekcj|rzecznik praw|prawnik|adwokat|pozew|sprawa do sadu|zglaszam sprawe|konsumenck/,
      /lawyer|legal action|\bsue\b|court|small claims|trading standards|report(ing)? (you|this) to/,
    ],
  },
  {
    flagType: "health_safety",
    severity: "high",
    patterns: [
      /wlos w |wlosy w |brud|niehigien|higien|zatrucie|zatrulem|zatrulam|plesn|robak|mysz|karaluch|szkodnik|przetermin/,
      /\bhair in\b|mould|moldy|food poison|hygien|filthy|insect|cockroach|expired|rotten/,
    ],
  },
  {
    flagType: "refund_issue",
    severity: "high",
    patterns: [
      /zwrot(u|em)?|reklamacj|policzyliscie|naliczyl|rachunek sie nie|paragon|oddajcie|nie oddali/,
      /refund|money back|charged (me|twice)|overcharg|wrong bill|compensation/,
    ],
  },
  {
    flagType: "offensive_language",
    severity: "medium",
    patterns: [
      /kurw|chuj|jeban|pierdol|debil|kretyn|idiot|zenada|dno i wodorosty/,
      /\bshit|\bfuck|disgusting|clowns|scam(mers)?\b/,
    ],
  },
  {
    flagType: "competitor_mention",
    severity: "medium",
    patterns: [
      /u konkurencj|obok robi|lepsz\w* (kawe|cappuccino|jedzenie) (w|u) |naprzeciwko robia/,
      /better (coffee|food|service) (at|across)|place across the street|competitor/,
    ],
  },
  {
    flagType: "complaint",
    severity: "medium",
    patterns: [
      /czekal|czekalam|czekalem|zimn(a|e|y)|nieuprzejm|opryskliw|niesmaczn|slaba obsluga|za drogo|pomylili|nie dojechal|brak(owalo)?/,
      /waited|cold (coffee|food|drink)|rude|slow service|overpriced|missing|never (came|arrived)|wrong order/,
    ],
  },
];

/** Role words followed by a capitalised first name. */
const STAFF_NAME_PATTERN =
  /\b(barist(a|ka)|kelner(ka)?|kelnerka|obsluga|pani|pan|kierownik|manager|waiter|waitress|server|bartender)\s+([A-ZŁŚŻŹĆÓĄĘŃ][\p{L}]{2,})/u;

const POLISH_MARKERS =
  /\b(nie|jest|bylo|byla|bardzo|kawa|obsluga|polecam|dzieki|ale|sie|jak|tylko|bardzo)\b/;

const CONTRAST_MARKERS = /\b(ale|jednak|niestety|szkoda|however|but|although)\b/;

export function detectLanguage(text: string): string {
  const normalized = normalize(text);
  const polishDiacritics = /[ąćęłńóśźż]/i.test(text);
  if (polishDiacritics) return "pl";
  return POLISH_MARKERS.test(normalized) ? "pl" : "en";
}

function detectFlags(
  text: string,
  stars: number,
  reviewerName: string | null | undefined,
): Array<Omit<ReviewRiskFlag, "id" | "reviewId" | "createdAt">> {
  const normalized = normalize(text);
  const flags: Array<Omit<ReviewRiskFlag, "id" | "reviewId" | "createdAt">> = [];

  for (const rule of FLAG_RULES) {
    const match = rule.patterns
      .map((pattern) => normalized.match(pattern))
      .find(Boolean);
    if (!match) continue;
    flags.push({
      flagType: rule.flagType,
      severity:
        rule.flagType === "complaint" && stars >= 4 ? "low" : rule.severity,
      evidence: extractEvidence(text, match[0]),
    });
  }

  const staffMatch = text.match(STAFF_NAME_PATTERN);
  if (staffMatch) {
    flags.push({
      flagType: "staff_named",
      severity: "high",
      evidence: extractEvidence(text, staffMatch[0]),
    });
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  if (stars <= 2 && wordCount <= 12 && !flags.some((f) => f.flagType === "complaint")) {
    flags.push({
      flagType: "likely_fake",
      severity: reviewerName ? "low" : "medium",
      evidence: "Very short negative review with no concrete detail",
    });
  }

  if (wordCount <= 8 && stars === 3) {
    flags.push({
      flagType: "unclear_sentiment",
      severity: "low",
      evidence: "Too short to tell what went wrong",
    });
  }

  return flags;
}

/** Returns the sentence containing the match, trimmed for display. */
function extractEvidence(originalText: string, match: string): string {
  const normalized = normalize(originalText);
  const index = normalized.indexOf(normalize(match));
  if (index < 0) return match;
  const start = Math.max(0, originalText.lastIndexOf(".", index) + 1);
  const endMarker = originalText.indexOf(".", index);
  const end = endMarker === -1 ? originalText.length : endMarker;
  return originalText.slice(start, end).trim().slice(0, 160);
}

function detectSentiment(
  text: string,
  stars: number,
  hasComplaintFlag: boolean,
): Sentiment {
  const contrast = CONTRAST_MARKERS.test(normalize(text));
  if (stars >= 5) return "positive";
  if (stars === 4) return contrast && hasComplaintFlag ? "mixed" : "positive";
  if (stars === 3) return contrast || hasComplaintFlag ? "mixed" : "neutral";
  return "negative";
}

export function classifyReview(
  input: ClassificationInput,
): ClassificationResult {
  const flags = detectFlags(input.reviewText, input.stars, input.reviewerName);
  const hasComplaint = flags.some((flag) => flag.flagType === "complaint");
  const sentiment = detectSentiment(input.reviewText, input.stars, hasComplaint);
  const language = input.language ?? detectLanguage(input.reviewText);

  const flagScore = flags.reduce(
    (total, flag) =>
      total + RISK_FLAG_WEIGHTS[flag.flagType] * SEVERITY_MULTIPLIER[flag.severity],
    0,
  );

  const riskScore = Math.min(
    100,
    Math.round(
      (STAR_RISK_BASE[input.stars] ?? 10) +
        SENTIMENT_RISK_BASE[sentiment] +
        flagScore,
    ),
  );

  const reasons: string[] = [];
  const belowAutoApprove = input.stars < input.approvalSettings.autoApproveMinStars;
  if (belowAutoApprove) {
    reasons.push(
      `Rated ${input.stars}, below the auto approval threshold of ${input.approvalSettings.autoApproveMinStars}.`,
    );
  }
  if (flags.length && input.approvalSettings.requireApprovalWhenRiskFlagged) {
    reasons.push(
      `${flags.length} risk flag${flags.length > 1 ? "s" : ""} detected.`,
    );
  }

  const requiresApproval =
    belowAutoApprove ||
    (flags.length > 0 && input.approvalSettings.requireApprovalWhenRiskFlagged);

  if (!requiresApproval) {
    reasons.push("Clean high rating. Eligible for automatic drafting.");
  }

  return { sentiment, language, riskScore, requiresApproval, flags, reasons };
}
