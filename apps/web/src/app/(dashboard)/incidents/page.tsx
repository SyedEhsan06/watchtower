import Link from "next/link";
import { apiServerFetch } from "@/lib/api-server";
import type { IncidentSummary } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";

interface IncidentWithService extends IncidentSummary {
  service: { id: string; name: string };
}

async function getIncidents(): Promise<IncidentWithService[]> {
  const res = await apiServerFetch("/incidents");
  if (!res.ok) return [];
  const data = await res.json();
  return data.incidents;
}

export default async function IncidentsPage() {
  const incidents = await getIncidents();

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-lg font-semibold">Incidents</h1>

      {incidents.length === 0 ? (
        <EmptyState title="No incidents" description="Incidents appear here when a service goes down." />
      ) : (
        <Card className="py-0">
          <div className="divide-y">
            {incidents.map((incident) => (
              <Link
                key={incident.id}
                href={`/services/${incident.service.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent/40"
              >
                <div>
                  <p className="font-medium">{incident.service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Started {new Date(incident.startedAt).toLocaleString()}
                  </p>
                </div>
                <Badge variant={incident.resolvedAt ? "outline" : "destructive"}>
                  {incident.resolvedAt ? "Resolved" : "Active"}
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
