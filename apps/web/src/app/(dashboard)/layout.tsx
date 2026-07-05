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
      <aside className="hidden w-56 shrink-0 border-r md:block">
        <div className="flex h-14 items-center border-b px-4 text-sm font-semibold">
          Watchtower
        </div>
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={user.email} />
        <main className="min-w-0 flex-1 overflow-x-hidden pb-16 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
