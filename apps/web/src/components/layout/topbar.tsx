"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { apiClientFetch } from "@/lib/api-client";

export function Topbar({ email }: { email: string }) {
  const router = useRouter();

  async function handleLogout() {
    await apiClientFetch("/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
      <div className="text-sm font-medium text-muted-foreground">{email}</div>
      <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
        <LogOut className="size-4" />
        Logout
      </Button>
    </header>
  );
}
