import type { LucideIcon } from "lucide-react";
import {
  Bot,
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
    label: "Pomiar",
    items: [
      { href: "/overview", label: "Przegląd", icon: LayoutGrid, status: "live", needsBusinessProfile: true },
      {
        href: "/visibility",
        label: "Widoczność w AI",
        icon: Eye,
        status: "live",
        needsBusinessProfile: true,
        description: "Czy asystenci polecają Twój lokal, gdy klient o niego pyta.",
      },
      { href: "/traffic", label: "Ruch z AI", icon: TrendingUp, status: "live", needsBusinessProfile: true },
      { href: "/conversions", label: "Konwersje", icon: Target, status: "live", needsBusinessProfile: true },
      { href: "/bots", label: "Boty AI", icon: Bot, status: "live", needsBusinessProfile: true },
      { href: "/install", label: "Instalacja", icon: Code2, status: "live", needsBusinessProfile: true },
    ],
  },
  {
    label: "Konto",
    items: [
      { href: "/team", label: "Zespół", icon: Users, status: "live" },
      { href: "/account", label: "Konto", icon: UserCog, status: "live" },
      { href: "/billing", label: "Rozliczenia", icon: CreditCard, status: "live" },
      { href: "/clients", label: "Klienci", icon: Building2, status: "live", platformOnly: true },
    ],
  },
];

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
