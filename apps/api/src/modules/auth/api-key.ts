import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@watchtower/database";

const KEY_PREFIX = "sk_wt_";
const KEY_RANDOM_BYTES = 32;
// How many chars of the plaintext key (including the sk_wt_ prefix) are
// retained in the DB so the UI can show "sk_wt_a1b2..." without ever
// storing enough of the key to reconstruct it.
const VISIBLE_PREFIX_LENGTH = 12;

/**
 * Hashes a presented API key for lookup/comparison. Keys have 256 bits of
 * entropy (unlike passwords), so a fast keyed hash is appropriate here —
 * unlike passwords, there's no need for scrypt's deliberate slowness.
 * HMAC-SHA256 is keyed with AUTH_SECRET so a leaked keyHash column alone
 * isn't directly usable without also knowing the server secret.
 */
function hashApiKey(plaintextKey: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error("AUTH_SECRET is not set. Refusing to hash API keys without it.");
  }
  return createHmac("sha256", secret).update(plaintextKey).digest("hex");
}

export interface CreatedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  /** Only ever populated on the creation response. Never persisted or logged. */
  plaintextKey: string;
}

/** Creates and persists a new API key scoped to a single server. Returns the plaintext key once. */
export async function createApiKey(params: {
  name: string;
  serverId: string;
  createdByUserId: string;
}): Promise<CreatedApiKey> {
  const plaintextKey = `${KEY_PREFIX}${randomBytes(KEY_RANDOM_BYTES).toString("base64url")}`;
  const keyHash = hashApiKey(plaintextKey);
  const keyPrefix = plaintextKey.slice(0, VISIBLE_PREFIX_LENGTH);

  const created = await prisma.apiKey.create({
    data: {
      name: params.name,
      keyHash,
      keyPrefix,
      serverId: params.serverId,
      createdByUserId: params.createdByUserId,
    },
  });

  return {
    id: created.id,
    name: created.name,
    keyPrefix: created.keyPrefix,
    createdAt: created.createdAt,
    plaintextKey,
  };
}

/**
 * Resolves a presented `Authorization: Bearer <key>` value to its owning,
 * non-revoked ApiKey record, updating lastUsedAt on success. Returns null
 * for any invalid, unknown, or revoked key — callers should treat all of
 * these identically (401), never distinguishing "revoked" from "unknown".
 */
export async function resolveApiKey(plaintextKey: string) {
  if (!plaintextKey.startsWith(KEY_PREFIX)) return null;

  const keyHash = hashApiKey(plaintextKey);
  const record = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!record) return null;

  // Defense in depth beyond the DB lookup itself: confirm the hash matches
  // via a timing-safe comparison rather than relying solely on findUnique.
  const presented = Buffer.from(keyHash, "hex");
  const stored = Buffer.from(record.keyHash, "hex");
  if (presented.length !== stored.length || !timingSafeEqual(presented, stored)) return null;

  if (record.revokedAt) return null;

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return record;
}
