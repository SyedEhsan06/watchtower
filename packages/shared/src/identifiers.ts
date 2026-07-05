/**
 * Strict allowlist for identifiers that get interpolated into remote shell commands
 * (Docker container names, PM2 process names, systemd unit names). Anything not
 * matching this pattern is rejected before it ever reaches the SSH layer.
 */
const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;

export function isSafeIdentifier(value: string): boolean {
  return SAFE_IDENTIFIER_PATTERN.test(value);
}

/** systemd unit names may include a trailing .service, .timer, etc. */
const SAFE_SYSTEMD_UNIT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.@-]{0,127}$/;

export function isSafeSystemdUnit(value: string): boolean {
  return SAFE_SYSTEMD_UNIT_PATTERN.test(value);
}

/** Absolute POSIX directory paths only, no traversal, no shell metacharacters. */
const SAFE_ABSOLUTE_PATH_PATTERN = /^\/[a-zA-Z0-9_\-./]*$/;

export function isSafeAbsolutePath(value: string): boolean {
  if (!SAFE_ABSOLUTE_PATH_PATTERN.test(value)) return false;
  if (value.includes("..")) return false;
  return true;
}
