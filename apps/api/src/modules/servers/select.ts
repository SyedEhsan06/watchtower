/**
 * Explicit allowlist select — encryptedSshPrivateKey, sshKeyIv, sshKeyAuthTag
 * must never be returned to the frontend. Always use this select, never `include`.
 */
export const serverPublicSelect = {
  id: true,
  name: true,
  description: true,
  host: true,
  sshPort: true,
  sshUsername: true,
  environment: true,
  provider: true,
  projectDirectories: true,
  connectionStatus: true,
  lastConnectedAt: true,
  lastConnectionError: true,
  sshHostKeyFingerprint: true,
  createdAt: true,
  updatedAt: true,
} as const;
