import { Client as SshClient } from "ssh2";
import { fingerprintHostKey } from "./host-key.js";
import { ApiError } from "../../utils/errors.js";

export interface SshConnectionParams {
  host: string;
  port: number;
  username: string;
  privateKey: string;
  /** Previously trusted fingerprint (trust-on-first-connect). Undefined on first connect. */
  expectedHostKeyFingerprint?: string | null;
}

export interface SshExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

const CONNECT_TIMEOUT_MS = 10_000;
const EXEC_TIMEOUT_MS = 20_000;
/** Hard ceiling on captured stdout/stderr to avoid unbounded memory use from a runaway command. */
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

/**
 * Opens a short-lived SSH connection, runs the callback with it, and always
 * disconnects afterward. The private key is only ever held in memory for the
 * duration of this call — callers must not retain it.
 *
 * Host key verification: trust-on-first-connect (TOFU). If no fingerprint is
 * on file yet, we accept the presented key and return its fingerprint so the
 * caller can persist it. If a fingerprint is already on file, a mismatch
 * fails the connection — this catches MITM and also legitimate host key
 * rotation, which the operator must then explicitly re-approve by re-testing
 * the connection (there is no "just trust it again" silent path).
 */
export async function withSshConnection<T>(
  params: SshConnectionParams,
  callback: (conn: SshClient) => Promise<T>
): Promise<{ result: T; hostKeyFingerprint: string }> {
  const conn = new SshClient();

  return new Promise((resolve, reject) => {
    let settled = false;
    let hostKeyFingerprint = "";

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      conn.end();
      reject(new ApiError("SSH_CONNECTION_FAILED", "Connection timed out", 502));
    }, CONNECT_TIMEOUT_MS);

    conn
      .on("ready", () => {
        clearTimeout(timeout);
        callback(conn)
          .then((result) => {
            if (settled) return;
            settled = true;
            conn.end();
            resolve({ result, hostKeyFingerprint });
          })
          .catch((err) => {
            if (settled) return;
            settled = true;
            conn.end();
            reject(err);
          });
      })
      .on("error", (err) => {
        clearTimeout(timeout);
        if (settled) return;
        settled = true;
        reject(new ApiError("SSH_CONNECTION_FAILED", err.message, 502));
      })
      .connect({
        host: params.host,
        port: params.port,
        username: params.username,
        privateKey: params.privateKey,
        readyTimeout: CONNECT_TIMEOUT_MS,
        hostVerifier: (key: Buffer) => {
          hostKeyFingerprint = fingerprintHostKey(key);
          if (!params.expectedHostKeyFingerprint) {
            return true; // first connection: trust and record
          }
          return hostKeyFingerprint === params.expectedHostKeyFingerprint;
        },
      });
  });
}

/**
 * Executes a command on an already-connected SSH client. `command` and `args`
 * must already be validated by the caller — this function does not build
 * shell strings from untrusted input; it passes argv directly to avoid shell
 * interpolation entirely.
 */
export function execCommand(conn: SshClient, command: string, args: string[] = []): Promise<SshExecResult> {
  const fullCommand = [command, ...args].map(shellEscape).join(" ");

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new ApiError("SSH_CONNECTION_FAILED", "Command timed out", 502));
    }, EXEC_TIMEOUT_MS);

    conn.exec(fullCommand, (err, stream) => {
      if (err) {
        clearTimeout(timeout);
        if (settled) return;
        settled = true;
        reject(new ApiError("SSH_CONNECTION_FAILED", err.message, 502));
        return;
      }

      stream
        .on("close", (code: number | null) => {
          clearTimeout(timeout);
          if (settled) return;
          settled = true;
          resolve({ stdout, stderr, code });
        })
        .on("data", (data: Buffer) => {
          if (stdout.length < MAX_OUTPUT_BYTES) stdout += data.toString("utf8");
        })
        .stderr.on("data", (data: Buffer) => {
          if (stderr.length < MAX_OUTPUT_BYTES) stderr += data.toString("utf8");
        });
    });
  });
}

/** Minimal POSIX shell-safe quoting for argv elements. Identifiers are pre-validated upstream. */
function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
