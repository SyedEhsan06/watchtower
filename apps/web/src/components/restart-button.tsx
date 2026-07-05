"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";

export function RestartButton({ serviceId, serviceName }: { serviceId: string; serviceName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [restarting, setRestarting] = useState(false);

  async function handleRestart() {
    setRestarting(true);
    try {
      const result = await apiClientFetch<{ success: boolean; message: string }>(`/services/${serviceId}/restart`, {
        method: "POST",
        body: JSON.stringify({ confirmServiceName: confirmText }),
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setOpen(false);
      setConfirmText("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Restart failed");
    } finally {
      setRestarting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="destructive" className="gap-2">
            <RotateCw className="size-4" />
            Restart
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restart {serviceName}?</DialogTitle>
          <DialogDescription>
            This will restart the underlying process. Type the service name to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-name">Service name</Label>
          <Input
            id="confirm-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={serviceName}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={confirmText !== serviceName || restarting}
            onClick={handleRestart}
          >
            {restarting ? "Restarting..." : "Restart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
