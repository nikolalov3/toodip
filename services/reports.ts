import "server-only";

import { cache } from "react";

import { requireSession } from "@/lib/auth/session";
import { addDays, isMonday, isoWeekKey, periodLabel, weekStartOf } from "@/lib/periods";
import { getUserClient } from "@/lib/supabase/server";
import { ASSISTANT_LABEL, assistantsFor, isWeeklyTenant } from "@/lib/weekly-reports";

/**
 * The tenant's view of the report queue: one measurement_jobs row per report
 * (a week or a month), read under row level security ("measurement jobs:
 * read own"). Cost is deliberately not selected; it is a platform number,
 * not a client one.
 */

export type ReportStatus = "pending" | "running" | "done" | "failed";

export interface ReportJob {
  id: string;
  /** The Monday of the week, or the first day of the month, the report belongs to. */
  scheduledFor: string;
  /** The period key the report's answers carry ("2026-W47", "2026-11"). */
  period: string;
  /** "Week of 16 Nov 2026", "Nov 2026". */
  label: string;
  cadence: "weekly" | "monthly";
  status: ReportStatus;
  runsPlanned: number;
  runsDone: number;
  runsFailed: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ReportsSnapshot {
  cadence: "weekly" | "monthly";
  /** The assistants each report asks. */
  assistants: string[];
  /** The open job (queued or in progress), if any. */
  current: ReportJob | null;
  /** When the next report starts, for when no job is open yet. */
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

function toJob(row: JobRow, weeklyTenant: boolean): ReportJob {
  const weekly = weeklyTenant && isMonday(row.scheduled_for);
  const period = weekly ? isoWeekKey(new Date(`${row.scheduled_for}T00:00:00Z`)) : row.scheduled_for.slice(0, 7);
  return {
    id: row.id,
    scheduledFor: row.scheduled_for,
    period,
    label: periodLabel(period),
    cadence: weekly ? "weekly" : "monthly",
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
  const weekly = isWeeklyTenant(session.tenantId);

  const { data, error } = await supabase
    .from("measurement_jobs")
    .select("id, scheduled_for, status, runs_planned, runs_done, runs_failed, started_at, finished_at")
    .eq("tenant_id", session.tenantId)
    .order("scheduled_for", { ascending: false })
    .limit(60);
  if (error) throw new Error(`Reports: ${error.message}`);

  const jobs = ((data ?? []) as JobRow[])
    // A monthly job that stood down for the weekly report asked nothing; it is not a report.
    .filter((row) => !(row.status === "done" && row.runs_planned === 0))
    .map((row) => toJob(row, weekly));
  const current = jobs.find((job) => job.status === "running") ?? jobs.find((job) => job.status === "pending" && (!weekly || job.cadence === "weekly")) ?? null;
  const history = jobs.filter((job) => job.status === "done" || job.status === "failed");

  return {
    cadence: weekly ? "weekly" : "monthly",
    assistants: assistantsFor(session.tenantId).map((a) => ASSISTANT_LABEL[a]),
    current,
    nextScheduledFor: weekly ? addDays(weekStartOf(new Date()), 7) : nextMonthStart(),
    history,
  };
});
