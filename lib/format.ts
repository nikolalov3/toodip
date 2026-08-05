import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export function formatDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy");
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy, HH:mm");
}

export function formatRelative(iso: string): string {
  return `${formatDistanceToNowStrict(parseISO(iso))} ago`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatHours(hours: number | null): string {
  if (hours === null) return "no data";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function initialsOf(name: string | null): string {
  if (!name) return "AN";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}...`;
}
