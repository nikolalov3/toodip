import { normalize } from "@/services/classification";
import type {
  BusinessProfile,
  KeywordBankItem,
  ReviewWithContext,
} from "@/types/domain";

/**
 * Post generation checks.
 *
 * Every draft passes through here, whether it came from the mock engine or from
 * a model. The score is what the operator sorts by, and the issue list is what
 * the review drawer shows when a draft looks wrong. Same rules for every engine
 * means changing the model never silently changes what ships.
 */

export interface QualityInput {
  text: string;
  review: ReviewWithContext;
  profile: BusinessProfile;
  keywords: KeywordBankItem[];
}

export interface QualityResult {
  score: number;
  safetyTags: string[];
  issues: string[];
  passes: string[];
}

const STOPWORDS = new Set([
  "the","and","for","was","were","that","this","with","have","from","they","would","there","been","very","just","when","only","also","about","into","than","them","some","kawa","bardzo","jest","byla","bylo","tylko","jako","ktore","ktora","ktory","sie","nie","tak","ale","oraz","przy","dla","jak","dobrze","mozna","zeby",
]);

function contentWords(text: string): string[] {
  return normalize(text)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 5 && !STOPWORDS.has(word));
}

/**
 * Polish inflects heavily: "czekalam" in the review and "czekanie" in the reply
 * are the same detail. Comparing five character stems catches that, where whole
 * word matching would call a perfectly good reply generic.
 */
function stems(text: string): string[] {
  return contentWords(text).map((word) => word.slice(0, 5));
}

function sentenceCount(text: string): number {
  // Emails, links and decimal numbers carry dots that are not sentence ends.
  const masked = text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "EMAIL")
    .replace(/https?:\/\/\S+/g, "LINK")
    .replace(/(\d)[.,](\d)/g, "$1$2");
  return masked.split(/[.!?]+/).filter((part) => part.trim().length > 2).length;
}

export function evaluateDraft({
  text,
  review,
  profile,
  keywords,
}: QualityInput): QualityResult {
  const issues: string[] = [];
  const passes: string[] = [];
  const safetyTags: string[] = [];
  let score = 100;

  const normalizedText = normalize(text);
  const sentences = sentenceCount(text);
  const isNegative = review.stars <= 2;

  // Length and shape.
  if (sentences < 2) {
    issues.push("Only one sentence. Reads abrupt for a public reply.");
    score -= 12;
  } else if (sentences > (isNegative ? 4 : 3)) {
    issues.push(`${sentences} sentences. Trim it, replies over three drift.`);
    score -= 10;
  } else {
    passes.push(`${sentences} sentences, within the target range.`);
    safetyTags.push("length_ok");
  }

  if (text.length > 420) {
    issues.push("Over 420 characters. Long replies get skimmed.");
    score -= 8;
  }

  // Does it echo something the reviewer actually said?
  const reviewStems = new Set(stems(review.reviewText));
  const echoed = contentWords(text).filter((word) =>
    reviewStems.has(word.slice(0, 5)),
  );
  if (echoed.length === 0) {
    issues.push("Echoes no detail from the review. Could be sent to anyone.");
    score -= 18;
  } else {
    passes.push(`Echoes the review: ${echoed.slice(0, 3).join(", ")}.`);
    safetyTags.push("detail_echo");
  }

  // Keyword discipline.
  const usedKeywords = keywords.filter((item) =>
    normalizedText.includes(normalize(item.phrase)),
  );
  if (usedKeywords.length > 1) {
    issues.push(
      `${usedKeywords.length} keyword phrases in one reply. That reads as stuffing.`,
    );
    safetyTags.push("keyword_stuffing");
    score -= 22;
  } else if (usedKeywords.length === 1) {
    passes.push(`One keyword phrase: ${usedKeywords[0].phrase}.`);
    safetyTags.push("keyword_single");
  }

  // Banned phrases from the brand profile.
  const banned = profile.bannedPhrases.filter(
    (phrase) => phrase.trim() && normalizedText.includes(normalize(phrase)),
  );
  if (banned.length) {
    issues.push(`Uses a banned phrase: ${banned.join(", ")}.`);
    safetyTags.push("banned_phrase");
    score -= 30;
  } else {
    passes.push("No banned phrases.");
  }

  // Never discuss money in public.
  if (/\b(zwrot|zwrocimy|refund|voucher|rabat|discount|kupon|gratis|free drink)\b/.test(normalizedText)) {
    issues.push("Mentions money, a refund or a freebie in a public reply.");
    safetyTags.push("public_compensation");
    score -= 28;
  } else {
    safetyTags.push("no_public_refund");
  }

  // Never repeat a named employee.
  const staffFlag = review.riskFlags.find((flag) => flag.flagType === "staff_named");
  if (staffFlag?.evidence) {
    const namedTokens = staffFlag.evidence
      .split(/\s+/)
      .filter((token) => /^[A-ZŁŚŻŹĆÓĄĘŃ][\p{L}]{2,}$/u.test(token))
      .map(normalize);
    const leaked = namedTokens.find((token) => normalizedText.includes(token));
    if (leaked) {
      issues.push("Repeats the employee name from the review.");
      safetyTags.push("staff_name_leak");
      score -= 34;
    } else {
      safetyTags.push("no_staff_name");
    }
  }

  // Negative reviews have to offer a way out of the public thread.
  if (isNegative) {
    const contact = [profile.escalationEmail, profile.escalationPhone]
      .filter(Boolean)
      .map((value) => normalize(String(value)));
    const hasContact = contact.some((value) => normalizedText.includes(value));
    if (hasContact) {
      passes.push("Gives a private contact route.");
      safetyTags.push("escalation_contact");
    } else {
      issues.push("Negative review with no private contact in the reply.");
      score -= 20;
    }

    const apologies = (
      normalizedText.match(/przepras|przykro|we are sorry|sorry that|apolog/g) ?? []
    ).length;
    if (apologies > 1) {
      issues.push("Apologises more than once. One apology reads stronger.");
      score -= 8;
    } else if (apologies === 1) {
      safetyTags.push("single_apology");
    }
  }

  // The business name should appear at most once.
  const nameHits = normalizedText.split(normalize(profile.name)).length - 1;
  if (nameHits > 1) {
    issues.push("Business name repeated. Once is enough.");
    score -= 10;
  }

  if (/[!]{2,}|!.*!/.test(text)) {
    issues.push("Stacked exclamation marks.");
    score -= 6;
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    safetyTags: [...new Set(safetyTags)],
    issues,
    passes,
  };
}
