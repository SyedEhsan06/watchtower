"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SIDEBAR_NAV_ITEMS } from "./nav-items";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {SIDEBAR_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all group",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn(
              "size-4 transition-transform",
              active ? "scale-110" : "group-hover:scale-110 text-muted-foreground group-hover:text-foreground"
            )} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
