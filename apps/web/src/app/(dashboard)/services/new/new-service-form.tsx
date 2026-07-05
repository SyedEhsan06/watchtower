"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import type { ServerSummary, ServiceSummary, ServiceGroupSummary } from "@/lib/types";
import { toast } from "sonner";

export interface ServicePrefill {
  serverId?: string;
  runtimeType?: string;
  name?: string;
  dockerContainerName?: string;
  pm2ProcessName?: string;
  groupId?: string;
}

export function NewServiceForm({
  servers,
  groups,
  service,
  prefill,
}: {
  servers: ServerSummary[];
  groups: ServiceGroupSummary[];
  service?: ServiceSummary;
  prefill?: ServicePrefill;
}) {
  const router = useRouter();
  const isEditing = Boolean(service);
  const [name, setName] = useState(service?.name ?? prefill?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [environment, setEnvironment] = useState(service?.environment ?? "PRODUCTION");
  const [serverId, setServerId] = useState<string>(service?.serverId ?? prefill?.serverId ?? "none");
  const [groupId, setGroupId] = useState<string>(service?.groupId ?? prefill?.groupId ?? "none");
  const [monitorType, setMonitorType] = useState(service?.monitorType ?? (prefill ? "SSH_RUNTIME" : "HTTP"));
  const [runtimeType, setRuntimeType] = useState(service?.runtimeType ?? prefill?.runtimeType ?? "UNKNOWN");

  const [url, setUrl] = useState(service?.url ?? "");
  const [host, setHost] = useState(service?.host ?? "");
  const [port, setPort] = useState(service?.port ? String(service.port) : "");
  const [expectedStatusCode, setExpectedStatusCode] = useState("200");
  const [timeoutMs, setTimeoutMs] = useState("5000");
  const [checkIntervalSeconds, setCheckIntervalSeconds] = useState(
    service?.checkIntervalSeconds ? String(service.checkIntervalSeconds) : "60"
  );

  const [dockerContainerName, setDockerContainerName] = useState(
    service?.dockerContainerName ?? prefill?.dockerContainerName ?? ""
  );
  const [pm2ProcessName, setPm2ProcessName] = useState(service?.pm2ProcessName ?? prefill?.pm2ProcessName ?? "");
  const [systemdUnitName, setSystemdUnitName] = useState(service?.systemdUnitName ?? "");
  const [workingDirectory, setWorkingDirectory] = useState(service?.workingDirectory ?? "");
  const [repositoryUrl, setRepositoryUrl] = useState(service?.repositoryUrl ?? "");

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        environment,
        serverId: serverId === "none" ? undefined : serverId,
        groupId: groupId === "none" ? (isEditing ? null : undefined) : groupId,
        monitorType,
        runtimeType,
        url: monitorType === "HTTP" ? url : undefined,
        host: monitorType === "TCP" ? host : undefined,
        port: monitorType === "TCP" ? Number(port) : undefined,
        expectedStatusCode: monitorType === "HTTP" ? Number(expectedStatusCode) : undefined,
        timeoutMs: Number(timeoutMs),
        checkIntervalSeconds: Number(checkIntervalSeconds),
        dockerContainerName: runtimeType === "DOCKER" ? dockerContainerName || undefined : undefined,
        pm2ProcessName: runtimeType === "PM2" ? pm2ProcessName || undefined : undefined,
        systemdUnitName: runtimeType === "SYSTEMD" ? systemdUnitName || undefined : undefined,
        workingDirectory: workingDirectory || undefined,
        repositoryUrl: repositoryUrl || undefined,
      };

      if (isEditing && service) {
        await apiClientFetch(`/services/${service.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Service updated");
        router.push(`/services/${service.id}`);
      } else {
        await apiClientFetch("/services", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Service created");
        router.push("/services");
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save service");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Travel CRM API" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Environment</Label>
              <Select value={environment} onValueChange={(v) => v && setEnvironment(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCTION">Production</SelectItem>
                  <SelectItem value="STAGING">Staging</SelectItem>
                  <SelectItem value="DEVELOPMENT">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Server</Label>
              <Select value={serverId} onValueChange={(v) => v && setServerId(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (public monitoring)</SelectItem>
                  {servers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Group</Label>
            <Select value={groupId} onValueChange={(v) => v && setGroupId(v)}>
              <SelectTrigger>
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
            <p className="text-xs text-muted-foreground">
              Groups related services together on the Services page (e.g. all containers for one app).
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monitoring</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Monitor Type</Label>
              <Select value={monitorType} onValueChange={(v) => v && setMonitorType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="TCP">TCP</SelectItem>
                  <SelectItem value="SSH_RUNTIME">SSH Runtime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Runtime Type</Label>
              <Select value={runtimeType} onValueChange={(v) => v && setRuntimeType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNKNOWN">Unknown</SelectItem>
                  <SelectItem value="DOCKER">Docker</SelectItem>
                  <SelectItem value="PM2">PM2</SelectItem>
                  <SelectItem value="SYSTEMD">systemd</SelectItem>
                  <SelectItem value="EXTERNAL">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {monitorType === "HTTP" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/health" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Expected Status</Label>
                <Input value={expectedStatusCode} onChange={(e) => setExpectedStatusCode(e.target.value)} />
              </div>
            </div>
          )}

          {monitorType === "TCP" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Host</Label>
                <Input value={host} onChange={(e) => setHost(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Port</Label>
                <Input value={port} onChange={(e) => setPort(e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Timeout (ms)</Label>
              <Input value={timeoutMs} onChange={(e) => setTimeoutMs(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Check Interval (s)</Label>
              <Input value={checkIntervalSeconds} onChange={(e) => setCheckIntervalSeconds(e.target.value)} />
            </div>
          </div>

          {runtimeType === "DOCKER" && (
            <div className="flex flex-col gap-1.5">
              <Label>Docker Container Name</Label>
              <Input value={dockerContainerName} onChange={(e) => setDockerContainerName(e.target.value)} placeholder="travel-crm-api" />
            </div>
          )}
          {runtimeType === "PM2" && (
            <div className="flex flex-col gap-1.5">
              <Label>PM2 Process Name</Label>
              <Input value={pm2ProcessName} onChange={(e) => setPm2ProcessName(e.target.value)} />
            </div>
          )}
          {runtimeType === "SYSTEMD" && (
            <div className="flex flex-col gap-1.5">
              <Label>systemd Unit Name</Label>
              <Input value={systemdUnitName} onChange={(e) => setSystemdUnitName(e.target.value)} placeholder="caddy" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Repository (optional)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Repository URL</Label>
            <Input value={repositoryUrl} onChange={(e) => setRepositoryUrl(e.target.value)} placeholder="git@github.com:org/repo.git" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Working Directory</Label>
            <Input value={workingDirectory} onChange={(e) => setWorkingDirectory(e.target.value)} placeholder="/var/www/travel-crm-api" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(isEditing && service ? `/services/${service.id}` : "/services")}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !name}>
          {saving ? "Saving..." : isEditing ? "Save Changes" : "Save Service"}
        </Button>
      </div>
    </>
  );
}
