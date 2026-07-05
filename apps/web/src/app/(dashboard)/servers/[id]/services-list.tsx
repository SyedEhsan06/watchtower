import Link from "next/link";
import type { ServiceSummary } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { StatusLabel } from "@/components/status-dot";
import { EmptyState } from "@/components/empty-state";

export function ServicesList({ services }: { services: ServiceSummary[] }) {
  if (services.length === 0) {
    return (
      <EmptyState
        title="No services on this server"
        description="Add a service to start monitoring it."
        action={{ href: "/services/new", label: "Add Service" }}
      />
    );
  }

  return (
    <Card className="py-0">
      <div className="divide-y">
        {services.map((service) => (
          <Link
            key={service.id}
            href={`/services/${service.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent/40"
          >
            <div className="flex items-center gap-3">
              <StatusLabel status={service.status} />
              <p className="font-medium">{service.name}</p>
            </div>
            <span className="text-xs text-muted-foreground">{service.runtimeType}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
