import { Badge } from "@/components/ui/badge";
import type { EnvironmentValue } from "@watchtower/shared";

const LABEL: Record<EnvironmentValue, string> = {
  PRODUCTION: "Production",
  STAGING: "Staging",
  DEVELOPMENT: "Development",
};

const VARIANT_CLASS: Record<EnvironmentValue, string> = {
  PRODUCTION: "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10",
  STAGING: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  DEVELOPMENT: "border-zinc-500/30 text-muted-foreground bg-zinc-500/10",
};

export function EnvironmentBadge({ environment }: { environment: EnvironmentValue }) {
  return (
    <Badge variant="outline" className={VARIANT_CLASS[environment]}>
      {LABEL[environment]}
    </Badge>
  );
}
