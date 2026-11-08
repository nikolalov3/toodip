import "server-only";

import { cache } from "react";

import { requireSession } from "@/lib/auth/session";
import { getUserClient } from "@/lib/supabase/server";

/**
 * The tenant's view of the monthly report queue: one measurement_jobs row per
 * month, read under row level security ("measurement jobs: read own"). Cost
 * is deliberately not selected; it is a platform number, not a client one.
 */

export type ReportStatus = "pending" | "running" | "done" | "failed";

export interface ReportJob {
  id: string;
  /** First day of the month the report belongs to, YYYY-MM-DD. */
  scheduledFor: string;
  status: ReportStatus;
  runsPlanned: number;
  runsDone: number;
  runsFailed: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ReportsSnapshot {
  /** The open job (queued or in progress), if any. */
  current: ReportJob | null;
  /** First day of next month, for when no job is open yet. */
  nextScheduledFor: string;
  /** Finished and failed reports, newest first. */
  history: ReportJob[];
}

interface JobRow {
  id: string;
  scheduled_for: string;
  status: ReportStatus;
  runs_planned: number;
  runs_done: number;
  runs_failed: number;
  started_at: string | null;
  finished_at: string | null;
}

/** First day of next month in UTC, the way the cron names its months. */
export function nextMonthStart(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
}

function toJob(row: JobRow): ReportJob {
  return {
    id: row.id,
    scheduledFor: row.scheduled_for,
    status: row.status,
    runsPlanned: row.runs_planned,
    runsDone: row.runs_done,
    runsFailed: row.runs_failed,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export const getReportsSnapshot = cache(async function getReportsSnapshot(): Promise<ReportsSnapshot> {
  const session = await requireSession();
  const supabase = await getUserClient();

  const { data, error } = await supabase
    .from("measurement_jobs")
    .select("id, scheduled_for, status, runs_planned, runs_done, runs_failed, started_at, finished_at")
    .eq("tenant_id", session.tenantId)
    .order("scheduled_for", { ascending: false })
    .limit(36);
  if (error) throw new Error(`Reports: ${error.message}`);

  const jobs = ((data ?? []) as JobRow[]).map(toJob);
  const current =
    jobs.find((job) => job.status === "pending" || job.status === "running") ?? null;
  const history = jobs.filter((job) => job.status === "done" || job.status === "failed");

  return { current, nextScheduledFor: nextMonthStart(), history };
});
