import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/** Encrypts plaintext with AES-256-GCM using a random IV. Never reuse an IV with the same key. */
export function encryptSecret(plaintext: string, masterKey: Buffer): EncryptedSecret {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/** Decrypts a secret previously produced by encryptSecret. Throws if the auth tag doesn't verify. */
export function decryptSecret(secret: EncryptedSecret, masterKey: Buffer): string {
  const decipher = createDecipheriv(ALGORITHM, masterKey, Buffer.from(secret.iv, "base64"));
  decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
