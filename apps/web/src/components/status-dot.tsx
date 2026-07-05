import { cn } from "@/lib/utils";

type Status = "UP" | "DOWN" | "DEGRADED" | "UNKNOWN" | "ONLINE" | "OFFLINE";

const COLOR_BY_STATUS: Record<Status, string> = {
  UP: "bg-emerald-500",
  ONLINE: "bg-emerald-500",
  DOWN: "bg-red-500",
  OFFLINE: "bg-red-500",
  DEGRADED: "bg-amber-500",
  UNKNOWN: "bg-zinc-400 dark:bg-zinc-600",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", COLOR_BY_STATUS[status], className)}
      aria-label={status}
    />
  );
}

const TEXT_COLOR_BY_STATUS: Record<Status, string> = {
  UP: "text-emerald-600 dark:text-emerald-400",
  ONLINE: "text-emerald-600 dark:text-emerald-400",
  DOWN: "text-red-600 dark:text-red-400",
  OFFLINE: "text-red-600 dark:text-red-400",
  DEGRADED: "text-amber-600 dark:text-amber-400",
  UNKNOWN: "text-muted-foreground",
};

export function StatusLabel({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", TEXT_COLOR_BY_STATUS[status], className)}>
      <StatusDot status={status} />
      {status[0] + status.slice(1).toLowerCase()}
    </span>
  );
}
