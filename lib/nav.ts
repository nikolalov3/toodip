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
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shipped modules only. Everything else renders as a planned surface. */
  status?: "live" | "planned";
  description?: string;
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
      },
      {
        href: "/reviews",
        label: "Reviews",
        icon: MessageSquareQuote,
        status: "live",
      },
      {
        href: "/queue",
        label: "Approval queue",
        icon: Inbox,
        status: "live",
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
      },
      {
        href: "/prompt-studio",
        label: "Prompt studio",
        icon: Terminal,
        status: "live",
      },
      { href: "/activity", label: "Activity", icon: Activity, status: "live" },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        href: "/visibility",
        label: "Visibility hub",
        icon: Radar,
        status: "planned",
        description:
          "Track how often assistants and search name this business for the prompts its customers actually use.",
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
      { href: "/billing", label: "Billing", icon: CreditCard, status: "live" },
    ],
  },
];

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
