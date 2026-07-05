import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-server";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border/50 bg-card/40 md:block">
        <div className="flex h-16 items-center border-b border-border/50 px-6 text-lg font-bold tracking-tight text-primary">
          <img src="/logo.png" alt="Watchtower" className="h-8 w-8 mr-3 rounded-md shadow-sm" />
          Watchtower
        </div>
        <div className="p-4">
          <SidebarNav />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={user.email} />
        <main className="min-w-0 flex-1 overflow-x-hidden pb-16 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
