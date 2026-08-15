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

// Development APIs often point at the shared Supabase database. Running a
// second in-process scheduler there would duplicate checks and, worse, could
// write results using a different SSH encryption key than production. Keep
// background jobs production-only unless a developer explicitly opts in.
const backgroundJobsEnabled = process.env.NODE_ENV === "production" || process.env.ENABLE_BACKGROUND_JOBS === "true";
const stopScheduler = backgroundJobsEnabled ? startScheduler(app.log) : () => undefined;
const stopRetentionJob = backgroundJobsEnabled ? startRetentionJob(app.log) : () => undefined;

if (!backgroundJobsEnabled) {
  app.log.info("Background monitoring jobs disabled; set ENABLE_BACKGROUND_JOBS=true for an isolated development database");
}

async function shutdown() {
  stopScheduler();
  stopRetentionJob();
  await app.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
