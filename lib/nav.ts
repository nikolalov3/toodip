import type { LucideIcon } from "lucide-react";
import {
  Bot,
  ClipboardList, // survey-module
  Building2,
  Code2,
  CreditCard,
  Eye,
  LayoutGrid,
  Target,
  TrendingUp,
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

/**
 * The panel's modules, in the order a venue owner reads them: how many people
 * and from where, whether AI recommends the venue, who sends traffic, what
 * that traffic does, whether AI bots read the site, and how to install.
 */
export const navGroups: NavGroup[] = [
  {
    label: "Measure",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutGrid, status: "live", needsBusinessProfile: true },
      { href: "/survey", label: "Survey", icon: ClipboardList, status: "live", needsBusinessProfile: true, siteModule: SURVEY_MODULE }, // survey-module
      {
        href: "/visibility",
        label: "AI Visibility",
        icon: Eye,
        status: "live",
        needsBusinessProfile: true,
        description: "Whether AI assistants recommend your venue when customers ask.",
      },
      { href: "/traffic", label: "AI Traffic", icon: TrendingUp, status: "live", needsBusinessProfile: true },
      { href: "/conversions", label: "Conversions", icon: Target, status: "live", needsBusinessProfile: true },
      { href: "/bots", label: "AI Bots", icon: Bot, status: "live", needsBusinessProfile: true },
      { href: "/install", label: "Install", icon: Code2, status: "live", needsBusinessProfile: true },
    ],
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

export function findNavItem(pathname: string): NavItem | null {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return item;
      }
    }
  }
  return null;
}
