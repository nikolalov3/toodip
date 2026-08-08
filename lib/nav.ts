import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageSquareQuote,
  Radar,
  Sparkles,
  Terminal,
  UserCog,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shipped modules only. Everything else renders as a planned surface. */
  status?: "live" | "planned";
  description?: string;
  /** Hidden from clients. Only the platform team sees these. */
  platformOnly?: boolean;
  /** About a venue, so pointless until the business profile exists. */
  needsBusinessProfile?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Navigation doubles as the product roadmap. The planned modules are real
 * routes with real explanations, not dead links, because this module is meant
 * to grow into a full local visibility platform.
 */
export const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        status: "live",
        needsBusinessProfile: true,
      },
      {
        href: "/reviews",
        label: "Reviews",
        icon: MessageSquareQuote,
        status: "live",
        needsBusinessProfile: true,
      },
      {
        href: "/queue",
        label: "Approval queue",
        icon: Inbox,
        status: "live",
        needsBusinessProfile: true,
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        href: "/brand",
        label: "Brand settings",
        icon: Building2,
        status: "live",
        needsBusinessProfile: true,
      },
      {
        href: "/prompt-studio",
        label: "Prompt studio",
        icon: Terminal,
        status: "live",
        needsBusinessProfile: true,
      },
      { href: "/activity", label: "Activity", icon: Activity, status: "live" },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        href: "/visibility",
        label: "Visibility",
        icon: Radar,
        status: "live",
        needsBusinessProfile: true,
        description:
          "How often assistants name this venue for real customer questions, and which sources feed those answers.",
      },
      {
        href: "/social",
        label: "Social content agent",
        icon: Sparkles,
        status: "planned",
        description:
          "Turn approved replies, guest photos and menu changes into scheduled posts that match the same brand voice.",
      },
      {
        href: "/competitors",
        label: "Competitors",
        icon: BarChart3,
        status: "planned",
        description:
          "Benchmark rating, review velocity and reply speed against the venues competing for the same street.",
      },
      {
        href: "/reports",
        label: "Reports",
        icon: FileText,
        status: "planned",
        description:
          "Monthly client ready PDF and white label reporting for agencies running several venues.",
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/team", label: "Team", icon: Users, status: "live" },
      { href: "/account", label: "Account", icon: UserCog, status: "live" },
      { href: "/billing", label: "Billing", icon: CreditCard, status: "live" },
      {
        href: "/clients",
        label: "Clients",
        icon: Building2,
        status: "live",
        platformOnly: true,
      },
    ],
  },
];

/**
 * Drops what this account cannot use, and any group left empty by that.
 *
 * Offering a link that immediately bounces the user back is worse than not
 * offering it, so venue screens disappear until a business profile exists.
 */
export function navGroupsFor(options: {
  isPlatformAdmin: boolean;
  hasBusinessProfile: boolean;
}): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.platformOnly && !options.isPlatformAdmin) return false;
        if (item.needsBusinessProfile && !options.hasBusinessProfile) return false;
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
