const KEY_LENGTH_BYTES = 32;

/**
 * Loads and validates SSH_MASTER_ENCRYPTION_KEY at boot. The process must fail
 * to start if this key is missing or malformed — there is no safe fallback.
 * Accepts a 32-byte key encoded as hex (64 chars) or base64.
 */
export function loadMasterEncryptionKey(): Buffer {
  const raw = process.env.SSH_MASTER_ENCRYPTION_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "SSH_MASTER_ENCRYPTION_KEY is not set. Refusing to start: SSH private keys cannot be encrypted safely."
    );
  }

  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    try {
      key = Buffer.from(raw, "base64");
    } catch {
      throw new Error("SSH_MASTER_ENCRYPTION_KEY is not valid hex or base64.");
    }
  }

  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `SSH_MASTER_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH_BYTES} bytes, got ${key.length}.`
    );
  }

  return key;
}
