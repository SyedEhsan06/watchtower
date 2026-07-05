import { loadMasterEncryptionKey } from "./modules/crypto/master-key.js";

// Fail fast: without a valid master key, SSH secrets could never be safely
// encrypted or decrypted, so we must not let the process start.
loadMasterEncryptionKey();

const { buildApp } = await import("./app.js");
const { startScheduler } = await import("./modules/scheduler/scheduler.js");
const { startRetentionJob } = await import("./modules/retention/retention.js");

const port = Number(process.env.PORT ?? 4000);

const app = await buildApp();

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

const stopScheduler = startScheduler(app.log);
const stopRetentionJob = startRetentionJob(app.log);

async function shutdown() {
  stopScheduler();
  stopRetentionJob();
  await app.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
