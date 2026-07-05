import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Server, Boxes, AlertTriangle, Bell, Settings } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/servers", label: "Servers", icon: Server },
  { href: "/services", label: "Services", icon: Boxes },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Mobile bottom nav fits 5 items comfortably.
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/servers", label: "Servers", icon: Server },
  { href: "/services", label: "Services", icon: Boxes },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/settings", label: "Settings", icon: Settings },
];
