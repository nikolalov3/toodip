import { Activity as ActivityIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader, Panel } from "@/components/common/surfaces";
import { requireSession } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { activityLabels } from "@/lib/labels";
import { getRepository } from "@/lib/repositories";
import type { ActivityLog } from "@/types/domain";

export const metadata: Metadata = { title: "Activity" };

function groupByDay(entries: ActivityLog[]): Array<[string, ActivityLog[]]> {
  const groups = new Map<string, ActivityLog[]>();
  for (const entry of entries) {
    const day = entry.createdAt.slice(0, 10);
    groups.set(day, [...(groups.get(day) ?? []), entry]);
  }
  return [...groups.entries()];
}

function describe(entry: ActivityLog): string | null {
  const metadata = entry.metadata as Record<string, unknown>;
  if (entry.action === "draft.generated" && metadata.count) {
    return `${metadata.count} drafts, model ${metadata.model ?? "unknown"}`;
  }
  if (entry.action === "review.classified") {
    const flags = metadata.flags as string[] | undefined;
    return `risk ${metadata.riskScore}, ${flags?.length ? flags.join(", ") : "no flags"}`;
  }
  if (entry.action === "review.created") {
    return `${metadata.source}, ${metadata.stars} stars`;
  }
  if (typeof metadata.notes === "string" && metadata.notes) {
    return metadata.notes;
  }
  return null;
}

export default async function ActivityPage() {
  await requireSession();
  const repo = await getRepository();
  const entries = await repo.listActivity({ limit: 200 });
  const days = groupByDay(entries);

  return (
    <>
      <PageHeader
        title="Activity"
        description="Every action on every review, with the person who took it. This is the record an agency shows a client when a reply is questioned."
      />

      {entries.length === 0 ? (
        <Panel>
          <EmptyState
            icon={ActivityIcon}
            title="Nothing recorded yet"
            description="Ingesting, drafting, editing, approving and publishing all leave an entry here."
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map(([day, dayEntries]) => (
            <Panel key={day}>
              <header className="border-b border-border px-4 py-2.5">
                <h2 className="text-xs font-semibold text-muted-foreground">
                  {formatDate(`${day}T00:00:00.000Z`)}
                </h2>
              </header>
              <ol className="divide-y divide-border">
                {dayEntries.map((entry) => {
                  const detail = describe(entry);
                  return (
                    <li
                      key={entry.id}
                      className="relative flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-2.5 hover:bg-accent/40"
                    >
                      <span className="text-sm font-medium">
                        {entry.actorName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {activityLabels[entry.action]}
                      </span>
                      {entry.entityType === "review" ||
                      entry.entityType === "review_draft" ? (
                        <Link
                          href={`/reviews/${entry.entityId}`}
                          className="text-xs text-brand after:absolute after:inset-0 hover:underline"
                        >
                          open review
                        </Link>
                      ) : null}
                      {detail && (
                        <span className="text-xs text-muted-foreground">
                          {detail}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
