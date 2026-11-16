import { Loader } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import type { PageTab } from "@/components/panel/page-tabs";
import { PeriodPicker } from "@/components/panel/period-picker";
import { AssistantTag, EmptyNote, Surface } from "@/components/panel/ui";
import { ASSISTANT_NAME, type ReportInProgress, type VisibilityOverview } from "@/services/visibility";
import type { BusinessProfile } from "@/types/domain";

/** The views of AI Visibility, in the order an owner asks the questions. */
export const VISIBILITY_TABS: PageTab[] = [
  { href: "/visibility", label: "Summary", exact: true },
  { href: "/visibility/assistants", label: "Assistants" },
  { href: "/visibility/questions", label: "Questions" },
  { href: "/visibility/share", label: "Competitors" },
  { href: "/visibility/sources", label: "Sources" },
  { href: "/visibility/answers", label: "Answers" },
  { href: "/visibility/actions", label: "Actions" },
  { href: "/visibility/setup", label: "Setup" },
];

/**
 * What the numbers on the page describe: which assistant, measured how, in
 * which period, on how many answers. Always the first line under the tabs,
 * so no number is ever read without its measurement.
 */
export function MeasurementLine({ overview, profile }: { overview: VisibilityOverview; profile?: BusinessProfile }) {
  const current = overview.current;
  if (!current) return null;
  const place = profile ? [profile.district, profile.city].filter(Boolean).join(", ") : "";
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
      <AssistantTag platform={current.platform} name={ASSISTANT_NAME[current.platform]} className="text-foreground" />
      <span aria-hidden>·</span>
      <span>{current.method.label}</span>
      <span aria-hidden>·</span>
      <Suspense fallback={<span className="font-medium text-foreground">{current.label}</span>}>
        <PeriodPicker periods={overview.periods} />
      </Suspense>
      <span aria-hidden>·</span>
      <span>
        <span className="text-numeric">{current.categoryRuns}</span> answers, ×{current.method.reps} per question
      </span>
      {profile && (
        <>
          <span aria-hidden>·</span>
          <span>
            {profile.category}
            {place ? ` in ${place}` : ""}
          </span>
        </>
      )}
      {overview.setAside && (
        <>
          <span aria-hidden>·</span>
          <span title="Answers the assistant gave from memory, without searching. They are stored as evidence, kept out of every number, and the questions were asked again with a search.">
            <span className="text-numeric">{overview.setAside.answers}</span> more from memory, not counted
          </span>
        </>
      )}
    </div>
  );
}

/** Shown while a report's job is still asking: its answers so far are not in any number. */
export function ProgressStrip({ progress }: { progress: ReportInProgress }) {
  const share = Math.min(100, Math.round((progress.done / Math.max(progress.planned, 1)) * 100));
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-brand/25 bg-brand-soft px-4 py-3 text-[13px]">
      <Loader className="size-4 shrink-0 animate-spin text-brand [animation-duration:2.4s]" aria-hidden />
      <p className="min-w-0 flex-1 basis-[240px]">
        <span className="font-semibold">The report for {progress.label.replace(/^Week/, "the week")} is being measured:</span>{" "}
        <span className="text-numeric">{progress.done}</span> of <span className="text-numeric">{progress.planned}</span> answers.{" "}
        <span className="text-muted-foreground">The numbers below are from the last finished report; a fragment is never shown as a result.</span>
      </p>
      <span className="h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-card sm:w-28" role="progressbar" aria-valuenow={share} aria-valuemin={0} aria-valuemax={100}>
        <i className="block h-full rounded-full bg-brand" style={{ width: `${share}%` }} />
      </span>
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <Surface className="border-critical/40 px-5 py-4">
      <p className="text-[14px] font-semibold text-critical">The measurements could not be loaded.</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        This is a read error, not an empty workspace: your data is still there. Reload the page; if it keeps failing, write to support with this message:{" "}
        <span className="font-mono">{message}</span>
      </p>
    </Surface>
  );
}

/** A tab with nothing to show before the first measurement. */
export function NoMeasurements({ canMeasure }: { canMeasure: boolean }) {
  return (
    <EmptyNote>
      No measurements yet. Once the first report runs, this view fills in.{" "}
      {canMeasure && (
        <Link href="/visibility/setup" className="font-medium text-brand hover:underline">
          Set up the questions and run the first one
        </Link>
      )}
    </EmptyNote>
  );
}
