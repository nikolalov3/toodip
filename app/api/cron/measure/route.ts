import { NextResponse, type NextRequest } from "next/server";

import { PLANS, type BillingPlan } from "@/lib/billing";
import { getServiceClient } from "@/lib/supabase/server";
import { effectivePlanFrom } from "@/services/billing";
import { executeRunForTenant } from "@/services/measurement";

/**
 * The monthly report runner. Vercel Cron calls this once a day (the Hobby
 * plan allows no more; on Pro the schedule in vercel.json can be tightened)
 * with `Authorization: Bearer $CRON_SECRET`. Each call does a bounded slice
 * of work, by count and by wall clock, so it always finishes inside the
 * function's time cap:
 *
 *   1. every tenant on a plan with measurements gets one job per month
 *      (unique per tenant+month, so a duplicate tick cannot create two);
 *   2. pending/running jobs advance by a few executions, progress persisted
 *      after every run — a tick that dies mid-way just resumes next time;
 *   3. a job completes when every active question has been asked REPS times
 *      or the plan's allowance is reached.
 *
 * `?dry=1` reports what would happen without executing anything — the safe
 * way to verify scheduling in any environment.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RUNS_PER_TICK = Math.max(1, Number(process.env.CRON_RUNS_PER_TICK ?? 60));
/** Stop starting new runs once this much of the tick has elapsed. */
const TIME_BUDGET_MS = Math.max(10_000, Number(process.env.CRON_TIME_BUDGET_MS ?? 260_000));
const REPS = Math.max(1, Number(process.env.MONTHLY_REPORT_REPS ?? 2));

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
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret
  );
}

function monthStart(): string {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = request.nextUrl.searchParams.get("dry") === "1";
  const startedAt = Date.now();
  const outOfTime = () => Date.now() - startedAt > TIME_BUDGET_MS;
  const service = getServiceClient();
  const month = monthStart();
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";

  // 1) Who is entitled to a report this month.
  const tenantsResult = await service
    .from("tenants")
    .select("id, name, billing_plan, billing_status");
  if (tenantsResult.error) {
    return NextResponse.json({ error: tenantsResult.error.message }, { status: 500 });
  }
  const eligible = ((tenantsResult.data ?? []) as TenantRow[])
    .map((row) => {
      const plan = effectivePlanFrom(row);
      return { ...row, plan, limit: PLANS[plan].monthlyRuns, planName: PLANS[plan].name };
    })
    .filter((row) => row.limit > 0);

  // 2) One job per eligible tenant per month.
  const jobsResult = await service
    .from("measurement_jobs")
    .select("id, tenant_id, status, runs_planned, runs_done, runs_failed, cost_usd")
    .eq("scheduled_for", month);
  if (jobsResult.error) {
    return NextResponse.json(
      {
        error: "measurement_jobs is not available in this environment",
        detail: jobsResult.error.message,
        hint: "Apply supabase/migrations/20261009120000_measurement_jobs.sql",
      },
      { status: 503 },
    );
  }
  const jobs = new Map<string, JobRow>();
  for (const job of (jobsResult.data ?? []) as JobRow[]) jobs.set(job.tenant_id, job);

  const created: string[] = [];
  for (const tenant of eligible) {
    if (jobs.has(tenant.id)) continue;
    if (dry) {
      created.push(tenant.name);
      continue;
    }
    const inserted = await service
      .from("measurement_jobs")
      .insert({ tenant_id: tenant.id, scheduled_for: month, status: "pending" })
      .select("id, tenant_id, status, runs_planned, runs_done, runs_failed, cost_usd")
      .single();
    if (!inserted.error && inserted.data) {
      jobs.set(tenant.id, inserted.data as JobRow);
      created.push(tenant.name);
    }
  }

  // 3) Advance open jobs, a bounded number of executions per tick.
  let budget = RUNS_PER_TICK;
  const processed: Array<Record<string, unknown>> = [];

  for (const tenant of eligible) {
    const job = jobs.get(tenant.id);
    if (!job || job.status === "done" || job.status === "failed") continue;

    const promptsResult = await service
      .from("visibility_prompts")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("created_at", { ascending: true });
    const prompts = (promptsResult.data ?? []) as Array<{ id: string }>;

    if (prompts.length === 0) {
      if (!dry) {
        await service
          .from("measurement_jobs")
          .update({ status: "failed", error: "No active questions in the battery.", finished_at: new Date().toISOString() })
          .eq("id", job.id);
      }
      processed.push({ tenant: tenant.name, status: "failed", reason: "no battery" });
      continue;
    }

    const planned = Math.min(prompts.length * REPS, tenant.limit);
    let attempted = job.runs_done + job.runs_failed;

    if (attempted >= planned) {
      if (!dry) {
        await service
          .from("measurement_jobs")
          .update({ status: "done", runs_planned: planned, finished_at: new Date().toISOString() })
          .eq("id", job.id);
      }
      processed.push({ tenant: tenant.name, status: "done", attempted, planned });
      continue;
    }

    if (dry) {
      processed.push({
        tenant: tenant.name,
        status: job.status,
        attempted,
        planned,
        wouldRunNow: Math.min(budget, planned - attempted),
      });
      budget -= Math.min(budget, planned - attempted);
      if (budget <= 0) break;
      continue;
    }

    if (!apiKey) {
      await service
        .from("measurement_jobs")
        .update({ status: "failed", error: "OPENAI_API_KEY is not set.", finished_at: new Date().toISOString() })
        .eq("id", job.id);
      processed.push({ tenant: tenant.name, status: "failed", reason: "no OPENAI_API_KEY" });
      continue;
    }

    const profile = await service
      .from("business_profiles")
      .select("name")
      .eq("tenant_id", tenant.id)
      .limit(1)
      .maybeSingle();
    const venueName = (profile.data as { name: string } | null)?.name ?? tenant.name;

    if (job.status === "pending") {
      await service
        .from("measurement_jobs")
        .update({ status: "running", runs_planned: planned, started_at: new Date().toISOString() })
        .eq("id", job.id);
    }

    let done = job.runs_done;
    let failedRuns = job.runs_failed;
    let cost = Number(job.cost_usd) || 0;

    while (budget > 0 && attempted < planned && !outOfTime()) {
      const prompt = prompts[Math.floor(attempted / REPS)];
      const outcome = await executeRunForTenant(
        {
          tenantId: tenant.id,
          venueName,
          runsLimit: tenant.limit,
          planName: tenant.planName,
          apiKey,
          supabase: service,
        },
        prompt.id,
      );
      attempted += 1;
      budget -= 1;
      if (outcome.ok) {
        done += 1;
        cost += outcome.costUsd ?? 0;
      } else {
        failedRuns += 1;
      }
      // Persist after every run so a dying tick loses at most one execution.
      await service
        .from("measurement_jobs")
        .update({ runs_done: done, runs_failed: failedRuns, cost_usd: cost, error: outcome.ok ? null : outcome.error ?? null })
        .eq("id", job.id);
    }

    const finished = attempted >= planned;
    if (finished) {
      await service
        .from("measurement_jobs")
        .update({ status: "done", finished_at: new Date().toISOString() })
        .eq("id", job.id);
    }
    processed.push({
      tenant: tenant.name,
      status: finished ? "done" : "running",
      attempted,
      planned,
      done,
      failed: failedRuns,
      costUsd: Math.round(cost * 100) / 100,
    });
    if (budget <= 0 || outOfTime()) break;
  }

  return NextResponse.json({
    month,
    dry,
    repsPerQuestion: REPS,
    runsPerTick: RUNS_PER_TICK,
    timeBudgetMs: TIME_BUDGET_MS,
    elapsedMs: Date.now() - startedAt,
    eligible: eligible.map((t) => ({ tenant: t.name, plan: t.plan, limit: t.limit })),
    jobsCreated: created,
    processed,
    runsExecuted: RUNS_PER_TICK - budget,
  });
}
