import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { PLANS, type BillingPlan } from "@/lib/billing";
import { getServiceClient } from "@/lib/supabase/server";
import { effectivePlanFrom } from "@/services/billing";
import { executeRunForTenant } from "@/services/measurement";

/**
 * The monthly report runner: one job per client, served in fair slices.
 *
 * Every tick (Vercel Cron once a day on Hobby, or the GitHub Actions
 * workflow every ten minutes; both carry `Authorization: Bearer $CRON_SECRET`):
 *
 *   1. ensure_measurement_jobs() creates this month's job for every entitled
 *      tenant in one statement (idempotent: unique per tenant + month);
 *   2. claim_measurement_jobs() hands this worker a few open jobs, least
 *      recently served first, and leases them, so a second worker running at
 *      the same time gets different ones (SKIP LOCKED) and a worker that died
 *      loses its lease after a minute;
 *   3. each claimed job advances by a small slice of runs, progress written
 *      after every run, then the lease is released and the next batch is
 *      claimed, until the tick's time budget is spent.
 *
 * So ten thousand tenants do not wait for the first one to finish: each pass
 * moves every open job a little. Transient provider errors (rate limits,
 * timeouts) end the slice without counting as attempts, so an outage never
 * burns a client's report.
 *
 * `?dry=1` reports what would happen without executing anything.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REPS = Math.max(1, Number(process.env.MONTHLY_REPORT_REPS ?? 2));
/** Jobs claimed per pass and runs per job per pass. */
const JOBS_PER_PASS = Math.max(1, Number(process.env.CRON_JOBS_PER_PASS ?? 5));
const SLICE_RUNS = Math.max(1, Number(process.env.CRON_SLICE_RUNS ?? 2));
const LEASE_SECONDS = 90;
/** Stop starting new runs once this much of the tick has elapsed. */
const TIME_BUDGET_MS = Math.max(10_000, Number(process.env.CRON_TIME_BUDGET_MS ?? 260_000));
/** Hard ceiling on executions per tick, whatever the clock says. */
const MAX_RUNS_PER_TICK = Math.max(1, Number(process.env.CRON_RUNS_PER_TICK ?? 60));

type JobStatus = "pending" | "running" | "done" | "failed";

interface JobRow {
  id: string;
  tenant_id: string;
  status: JobStatus;
  runs_planned: number;
  runs_done: number;
  runs_failed: number;
  cost_usd: number | string;
}

interface TenantRow {
  id: string;
  name: string;
  billing_plan: BillingPlan;
  billing_status: string;
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret") ??
    "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function monthStart(): string {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

/** Errors that say "not now", not "never": the slice ends, nothing is counted. */
function transient(error: string | undefined): boolean {
  return /429|rate limit|timed? ?out|aborted|5\d\d|ECONNRESET|fetch failed|daily AI budget/i.test(
    error ?? "",
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = request.nextUrl.searchParams.get("dry") === "1";
  const service = getServiceClient();
  const month = monthStart();
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const startedAt = Date.now();
  const outOfTime = () => Date.now() - startedAt > TIME_BUDGET_MS;

  // 1) One job per entitled tenant, in one statement.
  let created = 0;
  if (!dry) {
    const ensured = await service.rpc("ensure_measurement_jobs", { p_month: month });
    if (ensured.error) {
      return NextResponse.json(
        {
          error: "The measurement queue is not available in this environment",
          detail: ensured.error.message,
          hint: "Apply supabase/migrations/20261012120000_hardening.sql",
        },
        { status: 503 },
      );
    }
    created = Number(ensured.data ?? 0);
  }

  // 2) + 3) Claim, serve a slice, release; repeat while there is time.
  const processed: Array<Record<string, unknown>> = [];
  const served = new Set<string>();
  let executed = 0;
  let passes = 0;
  let stopReason = "queue drained";

  while (!outOfTime() && executed < MAX_RUNS_PER_TICK) {
    passes += 1;
    const claimed = await service.rpc("claim_measurement_jobs", {
      p_month: month,
      p_limit: JOBS_PER_PASS,
      p_lease_seconds: LEASE_SECONDS,
    });
    if (claimed.error) {
      return NextResponse.json(
        {
          error: "The measurement queue is not available in this environment",
          detail: claimed.error.message,
          hint: "Apply supabase/migrations/20261012120000_hardening.sql",
        },
        { status: 503 },
      );
    }
    const jobs = ((claimed.data ?? []) as JobRow[]).filter((job) => !served.has(job.id));
    if (jobs.length === 0) break;

    for (const job of jobs) {
      served.add(job.id);
      const result = await serveSlice(job);
      processed.push(result);
      if (outOfTime() || executed >= MAX_RUNS_PER_TICK) {
        stopReason = outOfTime() ? "time budget" : "run ceiling";
        break;
      }
    }
    // In dry mode a claim changes nothing we want to keep; release the leases
    // so the next real tick sees the queue as it was.
    if (dry) {
      await service
        .from("measurement_jobs")
        .update({ status: "pending", lease_until: null, started_at: null })
        .in("id", jobs.map((j) => j.id))
        .eq("runs_done", 0)
        .eq("runs_failed", 0);
      await service
        .from("measurement_jobs")
        .update({ lease_until: null })
        .in("id", jobs.map((j) => j.id));
      if (passes >= 3) break;
    }
  }

  return NextResponse.json({
    month,
    dry,
    repsPerQuestion: REPS,
    jobsPerPass: JOBS_PER_PASS,
    sliceRuns: SLICE_RUNS,
    jobsCreated: created,
    passes,
    runsExecuted: executed,
    elapsedMs: Date.now() - startedAt,
    stopReason,
    processed,
  });

  /** Advances one claimed job by at most SLICE_RUNS, then releases its lease. */
  async function serveSlice(job: JobRow): Promise<Record<string, unknown>> {
    const release = (patch: Record<string, unknown>) =>
      service
        .from("measurement_jobs")
        .update({ ...patch, lease_until: null, last_served_at: new Date().toISOString() })
        .eq("id", job.id);

    const tenantResult = await service
      .from("tenants")
      .select("id, name, billing_plan, billing_status")
      .eq("id", job.tenant_id)
      .maybeSingle();
    const tenant = tenantResult.data as TenantRow | null;
    if (!tenant) {
      if (!dry) await release({ status: "failed", error: "Tenant no longer exists." });
      return { job: job.id, status: "failed", reason: "no tenant" };
    }
    const plan = effectivePlanFrom(tenant);
    const limit = PLANS[plan].monthlyRuns;
    if (limit <= 0) {
      if (!dry) await release({ status: "failed", error: "The plan no longer includes measurements." });
      return { tenant: tenant.name, status: "failed", reason: "plan lapsed" };
    }

    const promptsResult = await service
      .from("visibility_prompts")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(500);
    const prompts = (promptsResult.data ?? []) as Array<{ id: string }>;
    if (prompts.length === 0) {
      // Not final: the client may write a battery later this month. The job
      // waits with a note and is looked at again next tick, after the others.
      if (!dry) await release({ status: "pending", error: "No active questions in the battery." });
      return { tenant: tenant.name, status: "waiting", reason: "no battery" };
    }

    const planned = Math.min(prompts.length * REPS, limit);
    let attempted = job.runs_done + job.runs_failed;
    if (attempted >= planned) {
      if (!dry) {
        await release({ status: "done", runs_planned: planned, finished_at: new Date().toISOString() });
      }
      return { tenant: tenant.name, status: "done", attempted, planned };
    }

    const wouldRun = Math.min(SLICE_RUNS, planned - attempted, MAX_RUNS_PER_TICK - executed);
    if (dry) {
      return { tenant: tenant.name, status: job.status, attempted, planned, wouldRunNow: wouldRun };
    }
    if (!apiKey) {
      // A platform problem, not the client's: wait, never fail the report.
      await release({ status: "pending", error: "OPENAI_API_KEY is not set." });
      return { tenant: tenant.name, status: "waiting", reason: "no OPENAI_API_KEY" };
    }

    const profile = await service
      .from("business_profiles")
      .select("name")
      .eq("tenant_id", tenant.id)
      .limit(1)
      .maybeSingle();
    const venueName = (profile.data as { name: string } | null)?.name ?? tenant.name;

    let done = job.runs_done;
    let failedRuns = job.runs_failed;
    let cost = Number(job.cost_usd) || 0;
    let lastError: string | null = null;
    let paused = false;

    for (let i = 0; i < wouldRun && !outOfTime(); i += 1) {
      const prompt = prompts[Math.floor(attempted / REPS) % prompts.length];
      const outcome = await executeRunForTenant(
        { tenantId: tenant.id, venueName, runsLimit: limit, planName: PLANS[plan].name, apiKey, supabase: service },
        prompt.id,
      );
      executed += 1;
      if (outcome.ok) {
        attempted += 1;
        done += 1;
        cost += outcome.costUsd ?? 0;
        lastError = null;
      } else if (transient(outcome.error)) {
        // Not this client's fault and not this question's: try again next tick.
        lastError = outcome.error ?? "transient error";
        paused = true;
        break;
      } else {
        attempted += 1;
        failedRuns += 1;
        lastError = outcome.error ?? null;
      }
      await service
        .from("measurement_jobs")
        .update({ runs_done: done, runs_failed: failedRuns, cost_usd: cost, runs_planned: planned, error: lastError })
        .eq("id", job.id);
    }

    const finished = attempted >= planned;
    await release(
      finished
        ? { status: "done", finished_at: new Date().toISOString() }
        : { status: "running" },
    );
    return {
      tenant: tenant.name,
      status: finished ? "done" : paused ? "paused" : "running",
      attempted,
      planned,
      done,
      failed: failedRuns,
      costUsd: Math.round(cost * 100) / 100,
      ...(lastError ? { error: lastError } : {}),
    };
  }
}
