/**
 * The little statistics the panel needs to tell a movement from noise.
 *
 * Every score here is a proportion: k answers out of n named the venue. An
 * assistant asked the same question twice does not answer the same way
 * twice, so two measurements of an unchanged venue differ by chance. These
 * helpers say how much: a range for one proportion, and whether two
 * proportions differ by more than chance explains. Plain formulas, no
 * dependencies, no model.
 */

/** z for a two-sided 95% level. */
const Z95 = 1.96;

export interface Range {
  low: number;
  high: number;
}

/**
 * Wilson score interval for k successes in n trials: the range the true rate
 * plausibly lies in. Behaves at 0% and 100% and with small n, where the
 * textbook "p ± 1.96·se" does not.
 */
export function wilson(k: number, n: number, z = Z95): Range {
  if (n <= 0) return { low: 0, high: 1 };
  const p = k / n;
  const z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

/** z statistic for the difference between two proportions (pooled). 0 when it cannot be computed. */
export function twoProportionZ(k1: number, n1: number, k2: number, n2: number): number {
  if (n1 <= 0 || n2 <= 0) return 0;
  const pooled = (k1 + k2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (se === 0) return 0;
  return (k2 / n2 - k1 / n1) / se;
}

export type Verdict = "up" | "down" | "noise";

/**
 * Did the rate really move from (k1 of n1) to (k2 of n2)? "noise" means the
 * difference is one that two measurements of an unchanged venue produce
 * about as often as not.
 */
export function movement(k1: number, n1: number, k2: number, n2: number): Verdict {
  const z = twoProportionZ(k1, n1, k2, n2);
  if (Math.abs(z) < Z95) return "noise";
  return z > 0 ? "up" : "down";
}

/**
 * How many percentage points two measurements of these sizes must differ by
 * before the difference counts, around a given rate. With 68 answers each at
 * 25% this is about 15 points: the honest footnote to any smaller delta.
 */
export function detectablePoints(n1: number, n2: number, rate: number): number {
  if (n1 <= 0 || n2 <= 0) return 100;
  // The worst case of the rate keeps the threshold honest near 0% and 100%.
  const p = Math.min(0.9, Math.max(0.1, rate));
  return Math.ceil(Z95 * Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)) * 100);
}

/**
 * The same question for plain counts (visits, crawler hits): is the change
 * from `before` to `now` more than the week-to-week wobble of a count that
 * size? Counts wobble by about their square root.
 */
export function countMovement(before: number, now: number): Verdict {
  const diff = now - before;
  if (Math.abs(diff) < 3) return "noise";
  const wobble = Z95 * Math.sqrt(Math.max(before, 1) + Math.max(now, 1));
  if (Math.abs(diff) < wobble) return "noise";
  return diff > 0 ? "up" : "down";
}

/** "15–34%" for a range of rates. */
export function rangeLabel(range: Range): string {
  return `${Math.round(range.low * 100)}–${Math.round(range.high * 100)}%`;
}
