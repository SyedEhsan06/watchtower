import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const update = vi.fn();
const recordAuditLog = vi.fn();

vi.mock("@watchtower/database", () => ({
  prisma: { server: { findFirst, update } },
}));
vi.mock("../audit/audit-log.js", () => ({ recordAuditLog }));

const { retrustHostKey } = await import("./retrust-host-key.js");

const params = { serverId: "srv-1", workspaceId: "ws-1", userId: "user-1" };

describe("retrustHostKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears the fingerprint and writes an audit entry with the old value", async () => {
    findFirst.mockResolvedValue({ id: "srv-1", sshHostKeyFingerprint: "SHA256:old" });

    const result = await retrustHostKey(params);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "srv-1", workspaceId: "ws-1" } }),
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: "srv-1" },
      data: { sshHostKeyFingerprint: null },
    });
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "server.host_key.retrust",
        result: "SUCCESS",
        serverId: "srv-1",
        userId: "user-1",
        metadata: { previousFingerprint: "SHA256:old" },
      }),
    );
    expect(result).toEqual({ cleared: true, previousFingerprint: "SHA256:old" });
  });

  it("does nothing for a server outside the workspace", async () => {
    findFirst.mockResolvedValue(null);

    expect(await retrustHostKey(params)).toBeNull();
    expect(update).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
