import { describe, expect, it } from "vitest";
import { parseSystemMetricsOutput } from "./system-metrics.js";

const SAMPLE = `
web-1
__WATCHTOWER_FS__
6.8.0-100-generic
__WATCHTOWER_FS__
4
__WATCHTOWER_FS__
12345.67 88888.00
__WATCHTOWER_FS__
0.50 0.40 0.30 1/200 1234
__WATCHTOWER_FS__
MemTotal:        2048000 kB
MemAvailable:    1024000 kB
__WATCHTOWER_FS__
Filesystem     1024-blocks    Used Available Use% Mounted on
/dev/sda1         10485760 3145728   7340032  30% /
__WATCHTOWER_FS__
PRETTY_NAME="Ubuntu 24.04 LTS"
NAME="Ubuntu"
`.trim();

describe("parseSystemMetricsOutput", () => {
  it("parses a combined metrics script payload", () => {
    const metrics = parseSystemMetricsOutput(
      SAMPLE,
      "2026-08-21T00:00:00.000Z",
    );
    expect(metrics.hostname).toBe("web-1");
    expect(metrics.kernel).toBe("6.8.0-100-generic");
    expect(metrics.cpuCount).toBe(4);
    expect(metrics.uptimeSeconds).toBe(12345);
    expect(metrics.loadAverage).toEqual([0.5, 0.4, 0.3]);
    expect(metrics.cpuUsagePercent).toBe(13);
    expect(metrics.memoryTotalMb).toBe(2000);
    expect(metrics.memoryAvailableMb).toBe(1000);
    expect(metrics.memoryUsedMb).toBe(1000);
    expect(metrics.diskTotalMb).toBe(10240);
    expect(metrics.diskUsedMb).toBe(3072);
    expect(metrics.os).toBe("Ubuntu 24.04 LTS");
    expect(metrics.collectedAt).toBe("2026-08-21T00:00:00.000Z");
  });
});
