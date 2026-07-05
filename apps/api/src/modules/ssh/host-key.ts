import { createHash } from "node:crypto";

/** SHA256 fingerprint of a host's public key, in the same format `ssh-keyscan`/OpenSSH prints. */
export function fingerprintHostKey(key: Buffer): string {
  const hash = createHash("sha256").update(key).digest("base64").replace(/=+$/, "");
  return `SHA256:${hash}`;
}
