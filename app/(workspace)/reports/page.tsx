import { format, parseISO } from "date-fns";
import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/common/surfaces";
import { buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { PLANS } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getReportsSnapshot, type ReportJob, type ReportStatus } from "@/services/reports";

export const metadata: Metadata = { title: "Reports" };

const STATUS: Record<ReportStatus, { label: string; className: string }> = {
  pending: { label: "Scheduled", className: "border-border bg-muted text-muted-foreground" },
  running: { label: "In progress", className: "border-brand/30 bg-brand-soft text-brand" },
  done: { label: "Done", className: "border-positive/30 bg-positive-soft text-positive" },
  failed: { label: "Failed", className: "border-destructive/30 bg-destructive/10 text-destructive" },
};

function monthLabel(isoDate: string): string {
  return format(parseISO(isoDate), "LLLL yyyy");
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const style = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}

function runsLabel(job: ReportJob): string {
  if (job.runsPlanned === 0) return "not started";
  return `${job.runsDone} / ${job.runsPlanned}`;
}

export default async function ReportsPage() {
  const session = await requireSession();
  const [, snapshot] = await Promise.all([requireBusinessProfile(), getReportsSnapshot()]);
  const measures = PLANS[session.effectivePlan].monthlyRuns > 0;
  const { current, history, nextScheduledFor } = snapshot;

  const upgradeLink = (
    <Link href="/billing" className={buttonVariants({ size: "sm", variant: "outline" })}>
      See plans
    </Link>
  );

  if (!current && history.length === 0) {
    return (
      <>
        <PageHeader
          title="Reports"
          description="The monthly measurement report: when the next one runs and how past ones went."
        />
        <Panel>
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description={
              measures
                ? `The first report runs on ${formatDate(nextScheduledFor)}. It appears here and under AI Visibility once it finishes.`
                : "Monthly reports are part of the Visibility plan. Upgrade and the first one runs at the start of next month."
            }
            action={measures ? undefined : upgradeLink}
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="The monthly measurement report: when the next one runs and how past ones went."
      />

      <div className="flex flex-col gap-4">
        <Panel>
          <PanelHeader
            title="Next report"
            description="Runs automatically. Results land under AI Visibility when it finishes."
          />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
            {current ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium">{monthLabel(current.scheduledFor)}</p>
                <StatusBadge status={current.status} />
                <p className="text-xs text-muted-foreground">
                  {current.status === "running"
                    ? `${current.runsDone} of ${current.runsPlanned} measurements done${current.runsFailed > 0 ? `, ${current.runsFailed} failed` : ""}.`
                    : "Queued. It starts on its own and usually finishes within the day."}
                </p>
              </div>
            ) : measures ? (
              <p className="text-sm">
                <span className="font-medium">{monthLabel(nextScheduledFor)}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  starts {formatDate(nextScheduledFor)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Monthly reports are part of the Visibility plan. The history below stays available.
              </p>
            )}
            {!current && !measures && upgradeLink}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader
            title="Past reports"
            description="One row per month. Measurements shows how many of the planned questions were answered."
          />
          {history.length === 0 ? (
            <p className="px-4 py-3.5 text-sm text-muted-foreground">
              No finished reports yet. The first one is above.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Month</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Measurements</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Finished</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((job) => (
                  <tr key={job.id} className="border-b border-border/70 last:border-b-0">
                    <td className="px-4 py-3 font-medium">{monthLabel(job.scheduledFor)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-3 py-3 text-numeric">
                      {runsLabel(job)}
                      {job.runsFailed > 0 && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {job.runsFailed} failed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {job.finishedAt ? formatDate(job.finishedAt) : "not finished"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href="/visibility" className="text-xs text-brand hover:underline">
                        Open in AI Visibility
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </>
  );
}
