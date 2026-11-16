import { isoWeekKey } from "@/lib/periods";

/**
 * Which workspaces get the WEEKLY report: every Monday the fixed question
 * battery is asked on each assistant below, and the week is read together
 * with the site's traffic. Everyone else keeps the monthly report on ChatGPT.
 *
 * A code-level switch on purpose while the cadence is observed on one venue.
 * WEEKLY_REPORT_TENANTS (comma separated tenant ids, or "none") overrides the
 * default without a deploy; when the cadence is offered to every client this
 * becomes a column on the tenant.
 */
const DEFAULT_WEEKLY_TENANTS = [
  "e885aeea-9d2a-4e3d-8d8d-2e6d2cfa6ef8", // Café Belmont
];

/** The assistants a report can measure. */
export type Assistant = "chatgpt" | "google";

export const ASSISTANT_LABEL: Record<Assistant, string> = {
  chatgpt: "ChatGPT",
  google: "Google AI",
};

export function weeklyTenantIds(): string[] {
  const configured = process.env.WEEKLY_REPORT_TENANTS?.trim();
  if (configured === undefined || configured === "") return DEFAULT_WEEKLY_TENANTS;
  if (/^(none|off|0)$/i.test(configured)) return [];
  return configured
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id) => /^[0-9a-f-]{36}$/.test(id));
}

export function isWeeklyTenant(tenantId: string): boolean {
  return weeklyTenantIds().includes(tenantId.toLowerCase());
}

/** The assistants one report asks, in the order their runs alternate. */
export function assistantsFor(tenantId: string): Assistant[] {
  return isWeeklyTenant(tenantId) ? ["chatgpt", "google"] : ["chatgpt"];
}

/**
 * The report a run made right now belongs to, when the workspace is on the
 * weekly cadence: the current ISO week. Monthly workspaces return undefined
 * and keep grouping by calendar month.
 */
export function currentReportPeriod(tenantId: string, now = new Date()): string | undefined {
  return isWeeklyTenant(tenantId) ? isoWeekKey(now) : undefined;
}
