import "server-only";

/**
 * Small in process limiter for anything that costs money per call.
 *
 * On serverless it counts per warm instance, so it is a brake rather than a
 * guarantee: it stops a runaway loop or an impatient click, not a determined
 * attacker. The real quota lives in the provider account budget, and a shared
 * counter moves to the database along with the Supabase adapter.
 */

interface Bucket {
  hits: number[];
}

const globalForLimiter = globalThis as unknown as {
  __rraRateLimiter?: Map<string, Bucket>;
};

const buckets: Map<string, Bucket> = (globalForLimiter.__rraRateLimiter ??=
  new Map());

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((stamp) => now - stamp < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((windowMs - (now - oldest)) / 1000),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: limit - bucket.hits.length,
    retryAfterSeconds: 0,
  };
}

export function generationRateLimit(): number {
  const configured = Number(process.env.GENERATION_RATE_LIMIT_PER_HOUR);
  return Number.isFinite(configured) && configured > 0 ? configured : 60;
}
