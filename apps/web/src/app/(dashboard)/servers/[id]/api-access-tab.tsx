"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { LiveToolbar } from "@/components/live-toolbar";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { useLiveResource } from "@/hooks/use-live-resource";
import { KeyRound, Plus, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Never";
}

function CreateKeyDialog({
  serverId,
  onCreated,
}: {
  serverId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const result = await apiClientFetch<{ apiKey: { plaintextKey: string } }>(
        `/servers/${serverId}/api-keys`,
        {
          method: "POST",
          body: JSON.stringify({ name }),
        },
      );
      setPlaintextKey(result.apiKey.plaintextKey);
      onCreated();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Failed to create API key",
      );
    } finally {
      setCreating(false);
    }
  }

  function handleCopy() {
    if (!plaintextKey) return;
    navigator.clipboard.writeText(plaintextKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset only after the dialog fully closes so the plaintext key
      // doesn't flash away mid-close animation.
      setTimeout(() => {
        setName("");
        setPlaintextKey(null);
        setCopied(false);
      }, 150);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2">
            <Plus className="size-4" />
            Generate new key
          </Button>
        }
      />
      <DialogContent>
        {plaintextKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Key generated</DialogTitle>
              <DialogDescription>
                Copy this key now — for security, it will not be shown again
                after you close this dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border bg-muted px-3 py-2 font-mono text-xs">
                {plaintextKey}
              </code>
              <Button size="icon-sm" variant="outline" onClick={handleCopy}>
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Generate new API key</DialogTitle>
              <DialogDescription>
                Creates a key scoped to this server only. Give it a name so you
                can recognize it later (e.g. "sydinnovations-os polling").
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="sydinnovations-os polling"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={name.trim().length === 0 || creating}
                onClick={handleCreate}
              >
                {creating ? "Generating..." : "Generate key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RevokeKeyButton({
  serverId,
  apiKey,
  onRevoked,
}: {
  serverId: string;
  apiKey: ApiKeySummary;
  onRevoked: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  async function handleRevoke() {
    setRevoking(true);
    try {
      await apiClientFetch(`/servers/${serverId}/api-keys/${apiKey.id}`, {
        method: "DELETE",
      });
      toast.success(`Revoked "${apiKey.name}"`);
      setOpen(false);
      onRevoked();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Failed to revoke key",
      );
    } finally {
      setRevoking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="destructive">
            Revoke
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke "{apiKey.name}"?</DialogTitle>
          <DialogDescription>
            This key will immediately stop working for any external caller. This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={revoking}
            onClick={handleRevoke}
          >
            {revoking ? "Revoking..." : "Revoke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ApiAccessTab({
  serverId,
  active,
}: {
  serverId: string;
  active: boolean;
}) {
  const { data, loading, refreshing, error, fetchedAt, refresh } =
    useLiveResource<{
      apiKeys: ApiKeySummary[];
    }>({
      path: `/servers/${serverId}/api-keys`,
      enabled: active,
    });

  const keys = data?.apiKeys ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-foreground">
              Use a key to authenticate external requests for this server:
            </p>
            <code className="mt-1 block w-fit rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
              Authorization: Bearer &lt;key&gt;
            </code>
            <p className="mt-2">
              Grants read-only access, scoped to this server only, to: server
              status, live metrics, Docker state, PM2 state, and incidents —
              under{" "}
              <code className="font-mono text-xs">
                GET /external/servers/{serverId}/*
              </code>
              .
            </p>
          </div>
        </div>
        <CreateKeyDialog serverId={serverId} onCreated={refresh} />
      </div>

      <LiveToolbar
        fetchedAt={fetchedAt}
        refreshing={refreshing}
        onRefresh={refresh}
      />

      {loading && !keys ? (
        <p className="text-sm text-muted-foreground">Loading API keys...</p>
      ) : error && !keys ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-red-500">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            className="w-fit gap-2"
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      ) : !keys || keys.length === 0 ? (
        <EmptyState
          title="No API keys yet"
          description="Generate a key to allow an external service to poll this server's data."
        />
      ) : (
        <>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Card className="py-0">
            <div className="divide-y">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{key.name}</p>
                      {key.revokedAt && (
                        <Badge
                          variant="secondary"
                          className="text-muted-foreground"
                        >
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {key.keyPrefix}…
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div>
                      <p>Created {formatDate(key.createdAt)}</p>
                      <p>Last used {formatDate(key.lastUsedAt)}</p>
                    </div>
                    {!key.revokedAt && (
                      <RevokeKeyButton
                        serverId={serverId}
                        apiKey={key}
                        onRevoked={refresh}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
