import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * The shared limiter: one fixed window per key, counted in Postgres through
 * the rate_limit_hit RPC, so every serverless instance sees the same number.
 * A database error other than "no such function" fails closed, because
 * everything it guards costs money or invites junk. A missing function means
 * the hardening migration is not applied yet: the call is allowed and a
 * warning is logged, so the public waitlist keeps working in the meantime.
 */
export async function checkSharedRateLimit(
  client: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const result = await client.rpc("rate_limit_hit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (result.error) {
    if (/does not exist|PGRST202|schema cache/i.test(result.error.message)) {
      console.warn("[rate-limit] rate_limit_hit missing; apply 20261012120000_hardening.sql");
      return true;
    }
    return false;
  }
  return result.data === true;
}

/** Keys never carry raw addresses or emails; they carry a short hash. */
export function rateLimitKey(scope: string, value: string): string {
  return `${scope}:${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}
