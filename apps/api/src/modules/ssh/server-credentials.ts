import { prisma } from "@watchtower/database";
import { decryptSecret } from "../crypto/secret-box.js";
import { loadMasterEncryptionKey } from "../crypto/master-key.js";
import { ApiError } from "../../utils/errors.js";
import type { SshConnectionParams } from "./ssh-client.js";

/**
 * Loads a server's SSH connection params, decrypting the private key into
 * memory for the duration of the caller's operation only. The decrypted key
 * is never persisted, logged, or returned from this function's caller chain
 * beyond the immediate SSH connection attempt.
 */
export async function loadServerSshParams(serverId: string): Promise<SshConnectionParams> {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) {
    throw new ApiError("NOT_FOUND", "Server not found", 404);
  }
  if (!server.sshUsername || !server.encryptedSshPrivateKey || !server.sshKeyIv || !server.sshKeyAuthTag) {
    throw new ApiError("SSH_CONNECTION_FAILED", "Server has no SSH credentials configured", 400);
  }

  const masterKey = loadMasterEncryptionKey();
  const privateKey = decryptSecret(
    { ciphertext: server.encryptedSshPrivateKey, iv: server.sshKeyIv, authTag: server.sshKeyAuthTag },
    masterKey
  );

  return {
    host: server.host,
    port: server.sshPort,
    username: server.sshUsername,
    privateKey,
    expectedHostKeyFingerprint: server.sshHostKeyFingerprint,
  };
}
