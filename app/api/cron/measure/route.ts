import { timingSafeEqual } from "node:crypto";

import { after, NextResponse, type NextRequest } from "next/server";

import { PLANS, type BillingPlan } from "@/lib/billing";
import { isMonday, isoWeekKey, weekStartOf } from "@/lib/periods";
import { fetchAll } from "@/lib/supabase/paginate";
import { getServiceClient } from "@/lib/supabase/server";
import { ASSISTANT_LABEL, assistantsFor, weeklyTenantIds, type Assistant } from "@/lib/weekly-reports";
import { writeReportNotes } from "@/services/analyst";
import { effectivePlanFrom } from "@/services/billing";
import { executeRunForTenant, googleEngineConfigured, resolveEngine } from "@/services/measurement";

/**
 * The report runner: one job per client and period, served in fair slices.
 *
 * Two cadences share one queue (measurement_jobs, unique per tenant and
 * scheduled_for):
 *
 *   - the MONTHLY report, scheduled_for = first day of the month, ChatGPT;
 *   - the WEEKLY report, scheduled_for = the Monday of the week, every
 *     assistant in lib/weekly-reports.ts, for the workspaces listed there.
 *     A weekly workspace's monthly job stands down the moment it is claimed.
 *
 * Every tick (Vercel Cron once a day, or the GitHub Actions workflow every
 * ten minutes; both carry `Authorization: Bearer $CRON_SECRET`):
 *
 *   1. ensure_measurement_jobs() creates this month's job for every entitled
 *      tenant in one statement, and this week's job is added for the weekly
 *      workspaces (both idempotent: unique per tenant + date);
 *   2. claim_measurement_jobs() hands this worker a few open jobs of each
 *      period, least recently served first, and leases them, so a second
 *      worker running at the same time gets different ones (SKIP LOCKED) and
 *      a worker that died loses its lease after a few minutes;
 *   3. each claimed job advances by a small slice of runs, progress written
 *      after every run, then the lease is released and the next batch is
 *      claimed, until the tick's time budget is spent.
 *
 * So ten thousand tenants do not wait for the first one to finish: each pass
 * moves every open job a little. Transient provider errors (rate limits,
 * timeouts) end the slice without counting as attempts, so an outage never
 * burns a client's report.
 *
 * A weekly report is complete when every question has its answers on every
 * assistant. What is missing is read from the ledger, so an answer that
 * failed, or one Google gave from memory without searching (stored as
 * evidence, never counted), is asked again until the report is whole.
 *
 * `?dry=1` reports what would happen without executing anything.
 * `?queue=weekly` or `?queue=monthly` serves one cadence only.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REPS = Math.max(1, Number(process.env.MONTHLY_REPORT_REPS ?? 2));
/** Jobs claimed per pass and runs per job per pass. */
const JOBS_PER_PASS = Math.max(1, Number(process.env.CRON_JOBS_PER_PASS ?? 5));
const SLICE_RUNS = Math.max(1, Number(process.env.CRON_SLICE_RUNS ?? 2));
/** Longer than the slowest run (a search call plus the extraction); renewed after every run. */
const LEASE_SECONDS = 180;
/** Stop starting new runs once this much of the tick has elapsed. */
const TIME_BUDGET_MS = Math.max(10_000, Number(process.env.CRON_TIME_BUDGET_MS ?? 240_000));
/** Hard ceiling on executions per tick, whatever the clock says. */
const MAX_RUNS_PER_TICK = Math.max(1, Number(process.env.CRON_RUNS_PER_TICK ?? 60));
/** How many self-triggered ticks may follow one scheduled trigger. */
const MAX_CHAIN_HOPS = Math.max(0, Number(process.env.CRON_MAX_CHAIN_HOPS ?? 120));

/** Left on a monthly job that stood down for the weekly report; Reports hides these rows. */
const SUPERSEDED = "Replaced by the weekly report.";
/** Left on a job whose period ended before it finished: what it has is its report. */
const CLOSED_UNFINISHED = "Closed unfinished at the end of its period.";

type JobStatus = "pending" | "running" | "done" | "failed";

interface JobRow {
  id: string;
  tenant_id: string;
  /** First day of the month, or the Monday of the week (ISO date). */
  scheduled_for: string;
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

/**
 * Errors that say "not now", not "never": the slice ends, nothing is counted.
 * A provider out of credits (402) is one of them: it is the platform's bill,
 * not the client's question, and the report resumes when the balance does.
 */
function transient(error: string | undefined): boolean {
  return /\b(?:402|429|5\d\d)\b|rate limit|more credits|insufficient credits|timed? ?out|aborted|ECONNRESET|fetch failed|daily AI budget/i.test(
    error ?? "",
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = request.nextUrl.searchParams.get("dry") === "1";
  const only = request.nextUrl.searchParams.get("queue");
  const service = getServiceClient();
  const month = monthStart();
  const week = weekStartOf(new Date());
  const weeklyTenants = weeklyTenantIds();
  const engine = resolveEngine();
  const startedAt = Date.now();
  const outOfTime = () => Date.now() - startedAt > TIME_BUDGET_MS;
  const queueUnavailable = (detail: string) =>
    NextResponse.json(
      {
        error: "The measurement queue is not available in this environment",
        detail,
        hint: "Apply supabase/migrations/20261012120000_hardening.sql",
      },
      { status: 503 },
    );

  // 1) One job per entitled tenant for the month, in one statement; then this
  //    week's job for the workspaces on the weekly cadence.
  let created = 0;
  let weeklyCreated = 0;
  const weeklyMissing: string[] = [];
  if (!dry && only !== "weekly") {
    const ensured = await service.rpc("ensure_measurement_jobs", { p_month: month });
    if (ensured.error) return queueUnavailable(ensured.error.message);
    created = Number(ensured.data ?? 0);
  }
  if (weeklyTenants.length > 0 && only !== "monthly") {
    const [existing, known] = await Promise.all([
      service.from("measurement_jobs").select("tenant_id").eq("scheduled_for", week).in("tenant_id", weeklyTenants),
      service.from("tenants").select("id").in("id", weeklyTenants),
    ]);
    if (existing.error) return queueUnavailable(existing.error.message);
    const have = new Set(((existing.data ?? []) as Array<{ tenant_id: string }>).map((row) => row.tenant_id));
    for (const row of (known.data ?? []) as Array<{ id: string }>) if (!have.has(row.id)) weeklyMissing.push(row.id);
    if (!dry && weeklyMissing.length > 0) {
      const inserted = await service
        .from("measurement_jobs")
        .upsert(
          weeklyMissing.map((tenant_id) => ({ tenant_id, scheduled_for: week })),
          { onConflict: "tenant_id,scheduled_for", ignoreDuplicates: true },
        )
        .select("id");
      if (inserted.error) return queueUnavailable(inserted.error.message);
      weeklyCreated = inserted.data?.length ?? 0;
    }
  }
  // Jobs are only served during their own period. One still open when its
  // period is over is closed with the answers it has, so no report hangs
  // "in progress" forever.
  if (!dry) {
    const closed = { status: "done", finished_at: new Date().toISOString(), lease_until: null, error: CLOSED_UNFINISHED };
    const older = month < week ? month : week;
    await service.from("measurement_jobs").update(closed).eq("status", "running").lt("scheduled_for", older);
    if (weeklyTenants.length > 0) {
      await service.from("measurement_jobs").update(closed).eq("status", "running").lt("scheduled_for", week).in("tenant_id", weeklyTenants);
    }
  }

  // The week first: it is the fresher report and the smaller queue.
  const queues = [...new Set([...(only === "monthly" ? [] : [week]), ...(only === "weekly" ? [] : [month])])];

  // 2) + 3) Claim, serve a slice, release; repeat while there is time.
  const processed: Array<Record<string, unknown>> = [];
  let executed = 0;
  let passes = 0;
  let stopReason = "queue drained";
  const openJobIds = new Set<string>();

  if (dry) {
    // Jobs a real tick would create are shown as if they were already queued.
    for (const tenant_id of weeklyMissing) {
      processed.push(
        await serveSlice({ id: "(new)", tenant_id, scheduled_for: week, status: "pending", runs_planned: 0, runs_done: 0, runs_failed: 0, cost_usd: 0 }),
      );
    }
  }

  while (!outOfTime() && executed < MAX_RUNS_PER_TICK) {
    passes += 1;
    const jobs: JobRow[] = [];
    for (const period of queues) {
      const claimed = await service.rpc("claim_measurement_jobs", {
        p_month: period,
        p_limit: JOBS_PER_PASS,
        p_lease_seconds: LEASE_SECONDS,
      });
      if (claimed.error) return queueUnavailable(claimed.error.message);
      jobs.push(...((claimed.data ?? []) as JobRow[]));
    }
    // A job may be claimed again in a later pass of the same tick: that is
    // how a tick with few clients keeps working until its time is up, each
    // pass giving every open job another small slice.
    if (jobs.length === 0) break;

    let progressed = false;
    for (const job of jobs) {
      const before = executed;
      const result = await serveSlice(job);
      if (executed > before) progressed = true;
      if (result.status === "running") openJobIds.add(job.id);
      else openJobIds.delete(job.id);
      processed.push(result);
      if (outOfTime() || executed >= MAX_RUNS_PER_TICK) {
        stopReason = outOfTime() ? "time budget" : "run ceiling";
        break;
      }
    }
    // Nothing executed in a whole pass (every job waiting or paused): stop,
    // otherwise the tick would spin on the same waiting jobs until its budget.
    if (!progressed && !dry) {
      stopReason = "nothing runnable";
      break;
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

  // Keep going on our own: while this tick did work and jobs are still open,
  // the next tick is called right after this response is sent. Scheduled
  // triggers (Vercel cron, the GitHub heartbeat) only need to start a chain;
  // leases keep two chains off the same job, and the hop counter ends a chain
  // that somehow never drains.
  const hop = Number(request.headers.get("x-tick-hop") ?? 0);
  const openJobs = openJobIds.size;
  // Chain only when this tick stopped for lack of time or budget with runnable
  // jobs still open; a tick that drained the queue or found nothing runnable
  // ends the chain.
  const chain =
    !dry && executed > 0 && openJobs > 0 && hop < MAX_CHAIN_HOPS &&
    (stopReason === "time budget" || stopReason === "run ceiling");
  if (chain) {
    const secret = process.env.CRON_SECRET?.trim() ?? "";
    const base = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || request.nextUrl.origin);
    const next = `${base}/api/cron/measure${only ? `?queue=${encodeURIComponent(only)}` : ""}`;
    after(async () => {
      try {
        await fetch(next, {
          headers: { authorization: `Bearer ${secret}`, "x-tick-hop": String(hop + 1) },
          signal: AbortSignal.timeout(5_000),
        });
      } catch {
        /* the next scheduled trigger picks it up */
      }
    });
  }

  return NextResponse.json({
    month,
    week,
    dry,
    queues,
    repsPerQuestion: REPS,
    jobsPerPass: JOBS_PER_PASS,
    sliceRuns: SLICE_RUNS,
    jobsCreated: created,
    weeklyJobsCreated: dry ? weeklyMissing.length : weeklyCreated,
    passes,
    runsExecuted: executed,
    elapsedMs: Date.now() - startedAt,
    stopReason,
    openJobs,
    chainedNext: chain,
    hop,
    processed,
  });

  /** Advances one claimed job by at most SLICE_RUNS, then releases its lease. */
  async function serveSlice(job: JobRow): Promise<Record<string, unknown>> {
    const release = (patch: Record<string, unknown>) =>
      service
        .from("measurement_jobs")
        .update({ ...patch, lease_until: null, last_served_at: new Date().toISOString() })
        .eq("id", job.id);
    const leaseUntil = () => new Date(Date.now() + LEASE_SECONDS * 1000).toISOString();

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

    // A weekly workspace is measured by its weekly jobs (scheduled on a
    // Monday). Its monthly job stands down unless the month happens to start
    // on a Monday, in which case the one row is that week's report.
    const weeklyTenant = weeklyTenants.includes(tenant.id);
    const weeklyJob = weeklyTenant && isMonday(job.scheduled_for);
    if (weeklyTenant && !weeklyJob) {
      if (!dry) await release({ status: "done", runs_planned: 0, finished_at: new Date().toISOString(), error: SUPERSEDED });
      return { tenant: tenant.name, status: "superseded", reason: "weekly cadence" };
    }
    const assistants: Assistant[] = weeklyJob ? assistantsFor(tenant.id) : ["chatgpt"];
    const reportPeriod = weeklyJob ? isoWeekKey(new Date(`${job.scheduled_for}T00:00:00Z`)) : undefined;
    const cadence = weeklyJob ? "weekly" : "monthly";

    const plan = effectivePlanFrom(tenant);
    const limit = PLANS[plan].monthlyRuns;
    if (limit <= 0) {
      if (!dry) await release({ status: "failed", error: "The plan no longer includes measurements." });
      return { tenant: tenant.name, cadence, status: "failed", reason: "plan lapsed" };
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
      // Not final: the client may write a battery later in the period. The job
      // waits with a note and is looked at again next tick, after the others.
      if (!dry) await release({ status: "pending", error: "No active questions in the battery." });
      return { tenant: tenant.name, cadence, status: "waiting", reason: "no battery" };
    }

    // One unit = one question asked once on one assistant. Units alternate
    // between the assistants, so both are measured over the same hours.
    const perQuestion = REPS * assistants.length;
    const planned = Math.min(prompts.length * perQuestion, limit);
    let attempted = job.runs_done + job.runs_failed;
    let done = job.runs_done;
    let failedRuns = job.runs_failed;

    // The weekly report reads what it still owes from the ledger: per
    // question and assistant, the answers that count. An answer asked by hand
    // in the same week counts; one Google gave without searching does not.
    // `attempted` then only bounds the retries, so a question that keeps
    // failing cannot keep a report open forever.
    let owed: Array<{ promptId: string; assistant: Assistant }> | null = null;
    if (weeklyJob && reportPeriod) {
      const held = await fetchAll<{ prompt_id: string; assistant: string | null; used_search: string | null }>(() =>
        service
          .from("visibility_runs")
          .select("prompt_id, assistant:raw->>assistant, used_search:raw->>used_search", { count: "exact" })
          .eq("tenant_id", tenant.id)
          .eq("raw->>report_period", reportPeriod)
          .order("id"),
      );
      if (held.error) {
        if (!dry) await release({ status: "running", error: `Could not read the report so far: ${held.error.message}` });
        return { tenant: tenant.name, cadence, status: "waiting", reason: "ledger read failed" };
      }
      const have = new Map<string, number>();
      for (const row of held.rows) {
        const assistant: Assistant = row.assistant === "google" ? "google" : "chatgpt";
        if (assistant === "google" && row.used_search === "false") continue;
        const key = `${row.prompt_id}|${assistant}`;
        have.set(key, (have.get(key) ?? 0) + 1);
      }
      owed = [];
      for (const prompt of prompts) {
        for (let rep = 0; rep < REPS; rep += 1) {
          for (const assistant of assistants) {
            if ((have.get(`${prompt.id}|${assistant}`) ?? 0) <= rep) owed.push({ promptId: prompt.id, assistant });
          }
        }
      }
      done = Math.min(planned, prompts.length * perQuestion - owed.length);
      attempted = Math.max(attempted, done);
      failedRuns = attempted - done;
    }
    // A quarter more attempts than answers planned: room to ask again what
    // failed or came back unsearched, and an end to it.
    const retryCeiling = planned + Math.ceil(planned / 4);
    const complete = () => (owed ? owed.length === 0 || done >= planned || attempted >= retryCeiling : attempted >= planned);

    /** Closes the report and has its summaries written, after the response is sent. */
    const finish = async () => {
      await release({ status: "done", runs_planned: planned, runs_done: done, runs_failed: failedRuns, finished_at: new Date().toISOString() });
      after(async () => {
        try {
          for (const result of await writeReportNotes(service, tenant.id, { createdBy: "cron", period: reportPeriod })) {
            if (!result.ok) console.warn("[analyst]", tenant.name, result.message);
          }
        } catch (error) {
          console.warn("[analyst]", tenant.name, (error as Error).message);
        }
      });
    };

    if (complete()) {
      if (!dry) await finish();
      return { tenant: tenant.name, cadence, ...(reportPeriod ? { period: reportPeriod } : {}), status: "done", answers: done, attempted, planned };
    }

    const wouldRun = Math.min(SLICE_RUNS, owed ? owed.length : planned - attempted, MAX_RUNS_PER_TICK - executed);
    if (dry) {
      return {
        tenant: tenant.name,
        cadence,
        ...(reportPeriod ? { period: reportPeriod } : {}),
        assistants: assistants.map((a) => ASSISTANT_LABEL[a]),
        questions: prompts.length,
        status: job.status,
        answers: done,
        attempted,
        planned,
        ...(owed ? { stillOwed: owed.length } : {}),
        wouldRunNow: wouldRun,
      };
    }
    if (!engine) {
      // A platform problem, not the client's: wait, never fail the report.
      await release({ status: "pending", error: "No measurement engine key (OPENAI_API_KEY or OPENROUTER_API_KEY)." });
      return { tenant: tenant.name, cadence, status: "waiting", reason: "no engine key" };
    }
    if (assistants.includes("google") && !googleEngineConfigured()) {
      await release({ status: "pending", error: "The Google assistant needs OPENROUTER_API_KEY." });
      return { tenant: tenant.name, cadence, status: "waiting", reason: "no key for Google" };
    }

    const profile = await service
      .from("business_profiles")
      .select("name")
      .eq("tenant_id", tenant.id)
      .limit(1)
      .maybeSingle();
    const venueName = (profile.data as { name: string } | null)?.name ?? tenant.name;

    let cost = Number(job.cost_usd) || 0;
    let lastError: string | null = null;
    let paused = false;

    for (let i = 0; i < wouldRun && !outOfTime(); i += 1) {
      const unit = owed
        ? owed[0]
        : {
            promptId: prompts[Math.floor(attempted / perQuestion) % prompts.length].id,
            assistant: assistants[attempted % assistants.length],
          };
      const outcome = await executeRunForTenant(
        {
          tenantId: tenant.id,
          venueName,
          runsLimit: limit,
          planName: PLANS[plan].name,
          engine,
          supabase: service,
          assistant: unit.assistant,
          reportPeriod,
        },
        unit.promptId,
      );
      executed += 1;
      if (outcome.ok) {
        attempted += 1;
        done += 1;
        cost += outcome.costUsd ?? 0;
        lastError = null;
        owed?.shift();
      } else if (transient(outcome.error)) {
        // Not this client's fault and not this question's: try again next tick.
        lastError = `${ASSISTANT_LABEL[unit.assistant]}: ${outcome.error ?? "transient error"}`;
        paused = true;
        break;
      } else {
        attempted += 1;
        failedRuns += 1;
        lastError = `${ASSISTANT_LABEL[unit.assistant]}: ${outcome.error ?? "failed"}`;
        // The unit goes to the back: the others are asked before it is tried again.
        if (owed) owed.push(owed.shift()!);
      }
      await service
        .from("measurement_jobs")
        .update({
          runs_done: done,
          runs_failed: failedRuns,
          cost_usd: cost,
          runs_planned: planned,
          error: lastError,
          lease_until: leaseUntil(),
        })
        .eq("id", job.id);
    }

    const finished = complete();
    if (finished) await finish();
    else await release({ status: "running", ...(paused ? { error: lastError } : {}) });
    return {
      tenant: tenant.name,
      cadence,
      ...(reportPeriod ? { period: reportPeriod } : {}),
      status: finished ? "done" : paused ? "paused" : "running",
      answers: done,
      attempted,
      planned,
      ...(owed ? { stillOwed: owed.length } : {}),
      retried: failedRuns,
      costUsd: Math.round(cost * 100) / 100,
      ...(lastError ? { error: lastError } : {}),
    };
  }
}
