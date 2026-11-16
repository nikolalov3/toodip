/**
 * Measurement periods. A period key is one of:
 *
 *   "2026-11"     a calendar month (the monthly report)
 *   "2026-W47"    an ISO week      (the weekly report)
 *   "2026-11-08"  a single day     (an imported or hand-made measurement)
 *
 * All arithmetic is in UTC, the way the cron names its periods. No server
 * imports here: the panel's client components format periods too.
 */

const DAY_MS = 864e5;

export type PeriodKind = "month" | "week" | "day";

export function periodKind(period: string): PeriodKind {
  if (/^\d{4}-W\d{2}$/.test(period)) return "week";
  return period.length === 7 ? "month" : "day";
}

export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Monday of the week a date falls in, as an ISO date. */
export function weekStartOf(date: Date): string {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

/** Whether an ISO date is a Monday, the day a weekly report is scheduled for. */
export function isMonday(isoDate: string): boolean {
  return weekStartOf(new Date(`${isoDate}T00:00:00Z`)) === isoDate;
}

/** ISO 8601 week of a date: a week belongs to the year its Thursday falls in. */
export function isoWeekKey(date: Date): string {
  const monday = Date.parse(`${weekStartOf(date)}T00:00:00Z`);
  const year = new Date(monday + 3 * DAY_MS).getUTCFullYear();
  const firstMonday = Date.parse(`${weekStartOf(new Date(Date.UTC(year, 0, 4)))}T00:00:00Z`);
  const week = Math.round((monday - firstMonday) / (7 * DAY_MS)) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Monday of an ISO week key, as an ISO date. */
export function isoWeekStart(key: string): string {
  const [year, week] = key.split("-W").map(Number);
  const firstMonday = Date.parse(`${weekStartOf(new Date(Date.UTC(year, 0, 4)))}T00:00:00Z`);
  return new Date(firstMonday + (week - 1) * 7 * DAY_MS).toISOString().slice(0, 10);
}

/** First day of a period, as an ISO date. */
export function periodStart(period: string): string {
  const kind = periodKind(period);
  if (kind === "week") return isoWeekStart(period);
  return kind === "month" ? `${period}-01` : period;
}

/** Last day of a period, as an ISO date. */
export function periodLastDay(period: string): string {
  const kind = periodKind(period);
  if (kind === "week") return addDays(isoWeekStart(period), 6);
  if (kind === "day") return period;
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

const DATE = { timeZone: "UTC" } as const;

/** "Nov 2026", "Week of 16 Nov 2026", "8 Nov 2026". */
export function periodLabel(period: string): string {
  const kind = periodKind(period);
  const d = new Date(`${periodStart(period)}T00:00:00Z`);
  if (kind === "month") return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", ...DATE });
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", ...DATE });
  return kind === "week" ? `Week of ${day}` : day;
}

/** The same without the year, for chart axes: "Nov", "16 Nov", "8 Nov". */
export function periodShortLabel(period: string): string {
  const d = new Date(`${periodStart(period)}T00:00:00Z`);
  return periodKind(period) === "month"
    ? d.toLocaleDateString("en-GB", { month: "short", ...DATE })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...DATE });
}

/** Whether a dated event (an intervention) falls inside a period. */
export function periodContains(period: string, isoDate: string): boolean {
  return isoDate >= periodStart(period) && isoDate <= periodLastDay(period);
}

/**
 * A period inside a sentence, with the preposition English wants:
 * "on 8 Nov 2026", "in Nov 2026", "in the week of 16 Nov 2026";
 * with "since": "since 8 Nov 2026", "since the week of 16 Nov 2026".
 */
export function periodPhrase(period: string, preposition: "in" | "since" = "in"): string {
  const kind = periodKind(period);
  const label = kind === "week" ? `the ${periodLabel(period).replace(/^W/, "w")}` : periodLabel(period);
  if (preposition === "since") return `since ${label}`;
  return `${kind === "day" ? "on" : "in"} ${label}`;
}
