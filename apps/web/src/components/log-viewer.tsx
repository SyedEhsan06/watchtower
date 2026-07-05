"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { RefreshCw, Copy, Download } from "lucide-react";
import { toast } from "sonner";

function highlightLine(line: string): string {
  if (/\berror\b/i.test(line)) return "text-red-400";
  if (/\bwarn(ing)?\b/i.test(line)) return "text-amber-400";
  return "text-zinc-300";
}

export function LogViewer({ serviceId }: { serviceId: string }) {
  const [lines, setLines] = useState("100");
  const [rawLogs, setRawLogs] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClientFetch<{ logs: string }>(`/services/${serviceId}/logs?lines=${lines}`);
      setRawLogs(data.logs);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [serviceId, lines]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  const logLines = rawLogs.split("\n").filter((line) => (filter ? line.toLowerCase().includes(filter.toLowerCase()) : true));

  function handleCopy() {
    navigator.clipboard.writeText(logLines.join("\n"));
    toast.success("Logs copied to clipboard");
  }

  function handleDownload() {
    const blob = new Blob([logLines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `service-${serviceId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <Select value={lines} onValueChange={(v) => v && setLines(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="100">Last 100</SelectItem>
            <SelectItem value="500">Last 500</SelectItem>
            <SelectItem value="1000">Last 1000</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button
          size="sm"
          variant={autoRefresh ? "default" : "outline"}
          onClick={() => setAutoRefresh((v) => !v)}
        >
          Auto-refresh {autoRefresh ? "On" : "Off"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2">
          <Copy className="size-4" />
          Copy
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="size-4" />
          Download
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <div
          ref={containerRef}
          className="max-h-[500px] overflow-y-auto rounded-md bg-zinc-950 p-3 font-mono text-xs leading-relaxed"
        >
          {logLines.length === 0 ? (
            <p className="text-zinc-500">No log lines to show.</p>
          ) : (
            logLines.map((line, i) => (
              <div key={i} className={highlightLine(line)}>
                {line || " "}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
