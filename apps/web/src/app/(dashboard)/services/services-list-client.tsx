"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, LayoutGrid, List, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  showGroupSelect = true,
}: {
  service: ServiceSummary;
  groups: ServiceGroupSummary[];
  onChanged: () => void;
  showGroupSelect?: boolean;
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
        {showGroupSelect && <GroupSelect service={service} groups={groups} onChanged={onChanged} />}
      </div>
    </Card>
  );
}

function ServiceListItem({
  service,
  groups,
  onChanged,
}: {
  service: ServiceSummary;
  groups: ServiceGroupSummary[];
  onChanged: () => void;
}) {
  return (
    <Card className="flex items-center justify-between p-4 shadow-sm transition-all hover:shadow-md border-border/50 bg-card/50 hover:bg-accent/10 mb-3">
      <Link href={`/services/${service.id}`} className="flex flex-1 items-center gap-4 group">
        <StatusLabel status={service.status} />
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-base">
            {service.name}
          </span>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">{service.server?.name ?? "External"}</span>
            <span>·</span>
            <span>{service.monitorType}</span>
            <span className="hidden sm:inline">· {service.runtimeType}</span>
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-6 ml-4">
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
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search services..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full sm:w-[250px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grouped"><LayoutGrid className="w-4 h-4 mr-2"/> Groups</TabsTrigger>
            <TabsTrigger value="list"><List className="w-4 h-4 mr-2"/> List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredServices.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No services found.
        </div>
      )}

      {viewMode === "list" && filteredServices.length > 0 && (
        <div className="flex flex-col">
          {filteredServices.map((service) => (
            <ServiceListItem key={service.id} service={service} groups={groups} onChanged={refresh} />
          ))}
        </div>
      )}

      {viewMode === "grouped" && sections.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sections.map((section) => (
            <Dialog key={section.id ?? "ungrouped"}>
              <DialogTrigger
                render={
                  <Card className="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:shadow-md transition-all border-border/50 hover:border-primary/50 group h-36 bg-gradient-to-b from-card to-muted/20" />
                }
              >
                <div className="p-2.5 bg-primary/10 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">{section.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{section.services.length} Services</p>
              </DialogTrigger>
              <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-4xl xl:max-w-5xl max-h-[85vh] overflow-y-auto">
                <DialogHeader className="mb-4">
                  <DialogTitle className="flex items-center justify-between text-xl">
                    <span>{section.name} Services</span>
                    {section.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 mr-6"
                        render={<Link href={`/services/new?groupId=${section.id}`} />}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add Service
                      </Button>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {section.services.map((service) => (
                    <ServiceCard 
                      key={service.id} 
                      service={service} 
                      groups={groups} 
                      onChanged={refresh} 
                      showGroupSelect={false} 
                    />
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}
