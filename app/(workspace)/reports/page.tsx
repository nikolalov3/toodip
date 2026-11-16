import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader, Panel } from "@/components/common/surfaces";
import { Chip, Eyebrow, SectionHead, Surface } from "@/components/panel/ui";
import { buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { PLANS } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { getReportsSnapshot, type ReportJob, type ReportStatus } from "@/services/reports";

export const metadata: Metadata = { title: "Report history" };

const STATUS: Record<ReportStatus, { label: string; className: string }> = {
  pending: { label: "Scheduled", className: "bg-muted text-muted-foreground" },
  running: { label: "In progress", className: "bg-brand-soft text-brand" },
  done: { label: "Done", className: "bg-positive-soft text-positive" },
  failed: { label: "Failed", className: "bg-critical-soft text-critical" },
};

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function runsLabel(job: ReportJob): string {
  if (job.runsPlanned === 0) return "not started";
  return `${job.runsDone} / ${job.runsPlanned}`;
}

export default async function ReportsPage() {
  const session = await requireSession();
  const [, snapshot] = await Promise.all([requireBusinessProfile(), getReportsSnapshot()]);
  const measures = PLANS[session.effectivePlan].monthlyRuns > 0;
  const { current, history, nextScheduledFor, cadence, assistants } = snapshot;
  const every = cadence === "weekly" ? "every Monday" : "on the 1st of every month";

  const header = (
    <PageHeader
      title="Report history"
      description={`Reports run on their own, ${every}, on ${listNames(assistants)}. The same questions every time, so each report can be compared with the last.`}
    />
  );
  const upgradeLink = (
    <Link href="/billing" className={buttonVariants({ size: "sm", variant: "outline" })}>
      See plans
    </Link>
  );

  if (!current && history.length === 0) {
    return (
      <>
        {header}
        <Panel>
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description={
              measures
                ? `The first report runs on ${formatDate(`${nextScheduledFor}T00:00:00.000Z`)}. It appears here and under Report once it finishes.`
                : "Scheduled reports are part of the Visibility plan. Upgrade and the first one runs at the start of next month."
            }
            action={measures ? undefined : upgradeLink}
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      {header}

      <Surface className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <Eyebrow>{current?.status === "running" ? "Being measured now" : "Next report"}</Eyebrow>
          {current ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <p className="text-[17px] font-semibold tracking-tight">{current.label}</p>
              <Chip className={STATUS[current.status].className}>{STATUS[current.status].label}</Chip>
              <p className="text-[13px] text-muted-foreground">
                {current.status === "running"
                  ? `${current.runsDone} of ${current.runsPlanned} answers${current.runsFailed > 0 ? `; ${current.runsFailed} did not count and are being asked again` : ""}. The panel keeps showing the last finished report until this one is complete.`
                  : "Queued. It starts on its own and usually finishes within the hour."}
              </p>
            </div>
          ) : measures ? (
            <p className="mt-1.5 text-[15px]">
              <span className="font-semibold">{formatDate(`${nextScheduledFor}T00:00:00.000Z`)}</span>
              <span className="ml-2 text-[13px] text-muted-foreground">starts on its own, results land under Report</span>
            </p>
          ) : (
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">Scheduled reports are part of the Visibility plan. The history below stays available.</p>
          )}
        </div>
        {current?.status === "running" && (
          <span className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
            <i className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((current.runsDone / Math.max(current.runsPlanned, 1)) * 100)}%` }} />
          </span>
        )}
        {!current && !measures && upgradeLink}
      </Surface>

      <SectionHead title="Past reports" sub="One row per report. Answers shows how many of the planned questions were answered." />
      <Surface className="overflow-x-auto">
        {history.length === 0 ? (
          <p className="px-5 py-5 text-[13.5px] text-muted-foreground">No finished reports yet. The first one is above.</p>
        ) : (
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead>
              <tr className="border-b border-border text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                <th className="px-5 py-3">Report</th>
                <th className="px-3 py-3">Cadence</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Answers</th>
                <th className="px-3 py-3">Finished</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {history.map((job) => (
                <tr key={job.id} className="border-b border-border/60 last:border-b-0">
                  <td className="px-5 py-3 font-medium">{job.label}</td>
                  <td className="px-3 py-3 capitalize text-muted-foreground">{job.cadence}</td>
                  <td className="px-3 py-3">
                    <Chip className={STATUS[job.status].className}>{STATUS[job.status].label}</Chip>
                  </td>
                  <td className="text-numeric px-3 py-3 text-right">
                    {runsLabel(job)}
                    {job.runsFailed > 0 && (
                      <span className="ml-1.5 text-[12px] text-muted-foreground" title="Attempts that did not count (a provider error, or an answer given without a search) and were asked again.">
                        {job.runsFailed} asked again
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{job.finishedAt ? formatDate(job.finishedAt) : "not finished"}</td>
                  <td className="px-5 py-3 text-right">
                    {job.runsDone > 0 && (
                      <Link href={`/report?period=${job.period}`} className="font-medium text-brand hover:underline">
                        Open report
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>
      <p className="mt-2 text-[12.5px] text-muted-foreground">
        Measurements made by hand or imported from elsewhere are not reports; they appear under AI Visibility, on the Assistants tab.
      </p>
    </>
  );
}
