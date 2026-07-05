"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusLabel } from "@/components/status-dot";
import { EnvironmentBadge } from "@/components/environment-badge";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import type { ServiceSummary, ServiceGroupSummary } from "@/lib/types";
import { toast } from "sonner";

function GroupSelect({
  service,
  groups,
  onChanged,
}: {
  service: ServiceSummary;
  groups: ServiceGroupSummary[];
  onChanged: () => void;
}) {
  const [value, setValue] = useState(service.groupId ?? "none");
  const [, startTransition] = useTransition();

  async function handleChange(next: string | null) {
    if (!next) return;
    const previous = value;
    setValue(next);
    try {
      await apiClientFetch(`/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({ groupId: next === "none" ? null : next }),
      });
      startTransition(onChanged);
    } catch (err) {
      setValue(previous);
      toast.error(err instanceof ApiClientError ? err.message : "Failed to move service");
    }
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger
        className="h-7 w-36 text-xs"
        onClick={(e) => e.preventDefault()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No group</SelectItem>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ServiceCard({
  service,
  groups,
  onChanged,
}: {
  service: ServiceSummary;
  groups: ServiceGroupSummary[];
  onChanged: () => void;
}) {
  return (
    <Card className="flex flex-col justify-between p-4 shadow-sm transition-all hover:shadow-md border-border/50 bg-card/50">
      <div className="mb-4 flex flex-col gap-3">
        <Link href={`/services/${service.id}`} className="group flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <StatusLabel status={service.status} />
            <span className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
              {service.name}
            </span>
          </div>
          <p className="ml-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">{service.server?.name ?? "External"}</span>
            <span>·</span>
            <span>{service.monitorType}</span>
            <span className="hidden sm:inline">· {service.runtimeType}</span>
          </p>
        </Link>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
        <EnvironmentBadge environment={service.environment} />
        <GroupSelect service={service} groups={groups} onChanged={onChanged} />
      </div>
    </Card>
  );
}

export function ServicesListClient({
  initialServices,
  groups,
}: {
  initialServices: ServiceSummary[];
  groups: ServiceGroupSummary[];
}) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [searchQuery, setSearchQuery] = useState("");

  async function refresh() {
    const data = await apiClientFetch<{ services: ServiceSummary[] }>("/services");
    setServices(data.services);
    router.refresh();
  }

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.server?.name ?? "External").toLowerCase().includes(q);
  });

  const grouped = new Map<string, { id: string | null; name: string; services: ServiceSummary[] }>();
  for (const service of filteredServices) {
    const key = service.group?.id ?? "__ungrouped__";
    if (!grouped.has(key)) {
      grouped.set(key, { id: service.group?.id ?? null, name: service.group?.name ?? "Ungrouped", services: [] });
    }
    grouped.get(key)!.services.push(service);
  }
  const sections = Array.from(grouped.values()).sort((a, b) => {
    if (a.id === null) return 1;
    if (b.id === null) return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Search services..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      {sections.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No services found.
        </div>
      )}

      {sections.map((section) => (
        <div key={section.id ?? "ungrouped"} className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              {section.name}
              <span className="flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground">
                {section.services.length}
              </span>
            </h2>
            {section.id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                render={<Link href={`/services/new?groupId=${section.id}`} />}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Service
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {section.services.map((service) => (
              <ServiceCard key={service.id} service={service} groups={groups} onChanged={refresh} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
