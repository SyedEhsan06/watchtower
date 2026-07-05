"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, Moon } from "lucide-react";
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
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
