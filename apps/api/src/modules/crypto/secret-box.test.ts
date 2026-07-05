import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret } from "./secret-box.js";

describe("encryptSecret / decryptSecret", () => {
  const key = randomBytes(32);

  it("round-trips plaintext through encryption and decryption", () => {
    const plaintext = "-----BEGIN OPENSSH PRIVATE KEY-----\nsome key material\n-----END OPENSSH PRIVATE KEY-----";
    const encrypted = encryptSecret(plaintext, key);
    const decrypted = decryptSecret(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it("produces a different ciphertext and IV each time (random IV)", () => {
    const plaintext = "same-secret";
    const first = encryptSecret(plaintext, key);
    const second = encryptSecret(plaintext, key);
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("throws when decrypting with the wrong key", () => {
    const plaintext = "top-secret";
    const encrypted = encryptSecret(plaintext, key);
    const wrongKey = randomBytes(32);
    expect(() => decryptSecret(encrypted, wrongKey)).toThrow();
  });

  it("throws when the ciphertext has been tampered with", () => {
    const plaintext = "top-secret";
    const encrypted = encryptSecret(plaintext, key);
    const tamperedByte = Buffer.from(encrypted.ciphertext, "base64");
    tamperedByte[0] = (tamperedByte[0] ?? 0) ^ 0xff;
    const tampered = { ...encrypted, ciphertext: tamperedByte.toString("base64") };
    expect(() => decryptSecret(tampered, key)).toThrow();
  });

  it("throws when the auth tag has been tampered with", () => {
    const plaintext = "top-secret";
    const encrypted = encryptSecret(plaintext, key);
    const tamperedTag = Buffer.from(encrypted.authTag, "base64");
    tamperedTag[0] = (tamperedTag[0] ?? 0) ^ 0xff;
    const tampered = { ...encrypted, authTag: tamperedTag.toString("base64") };
    expect(() => decryptSecret(tampered, key)).toThrow();
  });
});
