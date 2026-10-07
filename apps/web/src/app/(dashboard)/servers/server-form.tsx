"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import type { ServerSummary } from "@/lib/types";
import { toast } from "sonner";
import { X, Plus, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";

interface TestConnectionResult {
  success: true;
  hostname: string;
  osInfo: string | null;
  hostKeyFingerprint: string;
}

export function ServerForm({ server }: { server?: ServerSummary }) {
  const router = useRouter();
  const isEditing = Boolean(server);
  const [name, setName] = useState(server?.name ?? "");
  const [description, setDescription] = useState(server?.description ?? "");
  const [environment, setEnvironment] = useState(server?.environment ?? "PRODUCTION");
  const [provider, setProvider] = useState(server?.provider ?? "");
  const [host, setHost] = useState(server?.host ?? "");
  const [sshPort, setSshPort] = useState(server ? String(server.sshPort) : "22");
  const [sshUsername, setSshUsername] = useState(server?.sshUsername ?? "");
  const [sshPrivateKey, setSshPrivateKey] = useState("");
  const [projectDirectories, setProjectDirectories] = useState<string[]>(server?.projectDirectories ?? []);
  const [newDir, setNewDir] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [hostKeyFingerprint, setHostKeyFingerprint] = useState(server?.sshHostKeyFingerprint ?? null);
  const [retrusting, setRetrusting] = useState(false);

  function addDirectory() {
    const trimmed = newDir.trim();
    if (trimmed && !projectDirectories.includes(trimmed)) {
      setProjectDirectories([...projectDirectories, trimmed]);
      setNewDir("");
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const result = await apiClientFetch<TestConnectionResult>("/servers/test-connection", {
        method: "POST",
        body: JSON.stringify({
          host,
          sshPort: Number(sshPort) || 22,
          sshUsername,
          sshPrivateKey,
        }),
      });
      setTestResult(result);
    } catch (err) {
      setTestError(err instanceof ApiClientError ? err.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleRetrustHostKey() {
    if (!server) return;
    const confirmed = window.confirm(
      "Forget the pinned host key? Watchtower will trust whatever key this server presents on its next connection. Only do this if you know the host key changed (reinstall, snapshot restore).",
    );
    if (!confirmed) return;
    setRetrusting(true);
    try {
      await apiClientFetch(`/servers/${server.id}/retrust-host-key`, { method: "POST" });
      setHostKeyFingerprint(null);
      toast.success("Host key cleared. The next connection will re-trust the server.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to clear host key");
    } finally {
      setRetrusting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        environment,
        provider: provider || undefined,
        host,
        sshPort: Number(sshPort) || 22,
        sshUsername: sshUsername || undefined,
        sshPrivateKey: sshPrivateKey || undefined,
        projectDirectories,
      };

      if (isEditing && server) {
        await apiClientFetch(`/servers/${server.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Server updated");
        router.push(`/servers/${server.id}`);
      } else {
        const { server: created } = await apiClientFetch<{ server: { id: string } }>("/servers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Server saved");
        router.push(`/servers/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save server");
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
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production VPS" />
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
              <Label htmlFor="provider">Provider</Label>
              <Input id="provider" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Hetzner, DigitalOcean..." />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Connection</CardTitle>
          <CardDescription>
            {isEditing
              ? "Leave the private key blank to keep the currently stored key."
              : "Optional — leave blank to add this as a public-only server with no SSH access."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="host">Host / IP</Label>
              <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="203.0.113.10" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sshPort">SSH Port</Label>
              <Input id="sshPort" value={sshPort} onChange={(e) => setSshPort(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sshUsername">SSH Username</Label>
            <Input id="sshUsername" value={sshUsername} onChange={(e) => setSshUsername(e.target.value)} placeholder="monitor" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sshPrivateKey">SSH Private Key</Label>
            <Textarea
              id="sshPrivateKey"
              value={sshPrivateKey}
              onChange={(e) => setSshPrivateKey(e.target.value)}
              rows={6}
              className="font-mono text-xs"
              placeholder={isEditing ? "Leave blank to keep existing key" : "-----BEGIN OPENSSH PRIVATE KEY-----"}
            />
            <p className="text-xs text-muted-foreground">
              Encrypted at rest with AES-256-GCM. Never displayed again after saving.
            </p>
          </div>

          {isEditing && (
            <div className="flex flex-col gap-1.5 rounded-md border p-3">
              <Label>Trusted host key</Label>
              {hostKeyFingerprint ? (
                <>
                  <p className="break-all font-mono text-xs">{hostKeyFingerprint}</p>
                  <p className="text-xs text-muted-foreground">
                    Pinned on first connection. If the server&apos;s host key legitimately changed, re-trust it to
                    pin the new one.
                  </p>
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={handleRetrustHostKey} disabled={retrusting}>
                      <ShieldAlert className="size-3.5" />
                      {retrusting ? "Clearing..." : "Re-trust host key"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No host key pinned yet. The next successful connection will pin it.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing || !host || !sshUsername || !sshPrivateKey}
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            {testResult && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Connected to {testResult.hostname}
                {testResult.osInfo ? ` (${testResult.osInfo})` : ""}
              </span>
            )}
            {testError && (
              <span className="flex items-center gap-1.5 text-xs text-red-500">
                <XCircle className="size-3.5" />
                {testError}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Project Directories</CardTitle>
          <CardDescription>Only these directories will be scanned for Git repositories.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              value={newDir}
              onChange={(e) => setNewDir(e.target.value)}
              placeholder="/var/www"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDirectory())}
            />
            <Button type="button" variant="secondary" onClick={addDirectory}>
              <Plus className="size-4" />
            </Button>
          </div>
          {projectDirectories.length > 0 && (
            <ul className="flex flex-col gap-1">
              {projectDirectories.map((dir) => (
                <li key={dir} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm font-mono">
                  {dir}
                  <button
                    type="button"
                    onClick={() => setProjectDirectories(projectDirectories.filter((d) => d !== dir))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(isEditing && server ? `/servers/${server.id}` : "/servers")}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !name || !host}>
          {saving ? "Saving..." : isEditing ? "Save Changes" : "Save Server"}
        </Button>
      </div>
    </>
  );
}
