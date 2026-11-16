import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  ClipboardList, // survey-module
  Code2,
  CreditCard,
  Eye,
  History,
  Newspaper,
  UserCog,
  Users,
} from "lucide-react";

import { SURVEY_MODULE } from "@/lib/survey-module"; // survey-module

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  status?: "live" | "planned";
  description?: string;
  /** Other paths that belong to this item (its tabs live on their own routes). */
  match?: string[];
  /** Hidden from clients. Only the platform team sees these. */
  platformOnly?: boolean;
  /** About a venue, so pointless until the business profile exists. */
  needsBusinessProfile?: boolean;
  /** Only shown for sites that opted into this module (see SidebarNav `siteModules`). */
  siteModule?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** The views of the website module; they share one sidebar item and a row of tabs. */
export const WEBSITE_TABS = [
  { href: "/overview", label: "Traffic", exact: true },
  { href: "/traffic", label: "From AI" },
  { href: "/conversions", label: "Conversions" },
  { href: "/bots", label: "AI crawlers" },
];

/**
 * The panel's modules, in the order a venue owner reads them: the report
 * (what changed and what it means), the answers behind it, the website's
 * side of the story, then setup.
 */
export const navGroups: NavGroup[] = [
  {
    label: "Measure",
    items: [
      {
        href: "/report",
        label: "Report",
        icon: Newspaper,
        status: "live",
        needsBusinessProfile: true,
        description: "The latest report: what changed, what it means, what to do.",
      },
      {
        href: "/visibility",
        label: "AI Visibility",
        icon: Eye,
        status: "live",
        needsBusinessProfile: true,
        description: "Whether AI assistants recommend your venue when customers ask.",
      },
      {
        href: "/overview",
        label: "Website",
        icon: BarChart3,
        status: "live",
        needsBusinessProfile: true,
        match: ["/traffic", "/conversions", "/bots"],
        description: "Traffic, visits from AI, conversions and AI crawlers.",
      },
      { href: "/survey", label: "Survey", icon: ClipboardList, status: "live", needsBusinessProfile: true, siteModule: SURVEY_MODULE }, // survey-module
      {
        href: "/reports",
        label: "Report history",
        icon: History,
        status: "live",
        needsBusinessProfile: true,
        description: "Every report, past and scheduled.",
      },
    ],
  },
  {
    label: "Setup",
    items: [{ href: "/install", label: "Install", icon: Code2, status: "live", needsBusinessProfile: true }],
  },
  {
    label: "Account",
    items: [
      { href: "/team", label: "Team", icon: Users, status: "live" },
      { href: "/account", label: "Account", icon: UserCog, status: "live" },
      { href: "/billing", label: "Billing", icon: CreditCard, status: "live" },
      { href: "/clients", label: "Clients", icon: Building2, status: "live", platformOnly: true },
    ],
  },
];

export function navGroupsFor(options: {
  isPlatformAdmin: boolean;
  hasBusinessProfile: boolean;
  siteModules?: string[];
}): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.platformOnly && !options.isPlatformAdmin) return false;
        if (item.needsBusinessProfile && !options.hasBusinessProfile) return false;
        if (item.siteModule && !(options.siteModules ?? []).includes(item.siteModule)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

/** Whether a path belongs to a nav item: its own route, a route under it, or one of its tabs. */
export function navItemActive(item: NavItem, pathname: string): boolean {
  return [item.href, ...(item.match ?? [])].some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

export function findNavItem(pathname: string): NavItem | null {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (navItemActive(item, pathname)) return item;
    }
  }
  return null;
}
