import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { loadMasterEncryptionKey } from "./master-key.js";

describe("loadMasterEncryptionKey", () => {
  const original = process.env.SSH_MASTER_ENCRYPTION_KEY;

  afterEach(() => {
    if (original === undefined) delete process.env.SSH_MASTER_ENCRYPTION_KEY;
    else process.env.SSH_MASTER_ENCRYPTION_KEY = original;
  });

  it("throws when the key is missing", () => {
    delete process.env.SSH_MASTER_ENCRYPTION_KEY;
    expect(() => loadMasterEncryptionKey()).toThrow(/not set/i);
  });

  it("throws when the key is empty", () => {
    process.env.SSH_MASTER_ENCRYPTION_KEY = "   ";
    expect(() => loadMasterEncryptionKey()).toThrow();
  });

  it("throws when the key is not valid hex/base64 length (32 bytes)", () => {
    process.env.SSH_MASTER_ENCRYPTION_KEY = "tooshort";
    expect(() => loadMasterEncryptionKey()).toThrow(/32 bytes/i);
  });

  it("accepts a valid 64-char hex key", () => {
    process.env.SSH_MASTER_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    const key = loadMasterEncryptionKey();
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it("accepts a valid base64-encoded 32-byte key", () => {
    process.env.SSH_MASTER_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const key = loadMasterEncryptionKey();
    expect(key.length).toBe(32);
  });
});
