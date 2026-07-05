import { describe, it, expect } from "vitest";
import { isSafeIdentifier, isSafeSystemdUnit, isSafeAbsolutePath } from "./identifiers.js";

describe("isSafeIdentifier", () => {
  it("accepts typical container/process names", () => {
    expect(isSafeIdentifier("travel-crm-api")).toBe(true);
    expect(isSafeIdentifier("travel_crm.api-1")).toBe(true);
    expect(isSafeIdentifier("a")).toBe(true);
  });

  it("rejects shell metacharacters and injection attempts", () => {
    expect(isSafeIdentifier("api; rm -rf /")).toBe(false);
    expect(isSafeIdentifier("api && whoami")).toBe(false);
    expect(isSafeIdentifier("$(whoami)")).toBe(false);
    expect(isSafeIdentifier("api`whoami`")).toBe(false);
    expect(isSafeIdentifier("api|cat /etc/passwd")).toBe(false);
    expect(isSafeIdentifier("../etc/passwd")).toBe(false);
    expect(isSafeIdentifier("api name")).toBe(false); // spaces not allowed
  });

  it("rejects empty strings and names starting with a non-alphanumeric", () => {
    expect(isSafeIdentifier("")).toBe(false);
    expect(isSafeIdentifier("-api")).toBe(false);
    expect(isSafeIdentifier(".api")).toBe(false);
  });

  it("rejects names longer than 128 characters", () => {
    expect(isSafeIdentifier("a".repeat(129))).toBe(false);
    expect(isSafeIdentifier("a".repeat(128))).toBe(true);
  });
});

describe("isSafeSystemdUnit", () => {
  it("accepts typical unit names including template units", () => {
    expect(isSafeSystemdUnit("caddy")).toBe(true);
    expect(isSafeSystemdUnit("my-api.service")).toBe(true);
    expect(isSafeSystemdUnit("getty@tty1.service")).toBe(true);
  });

  it("rejects shell metacharacters", () => {
    expect(isSafeSystemdUnit("caddy; rm -rf /")).toBe(false);
    expect(isSafeSystemdUnit("$(whoami)")).toBe(false);
  });
});

describe("isSafeAbsolutePath", () => {
  it("accepts absolute paths without traversal", () => {
    expect(isSafeAbsolutePath("/var/www")).toBe(true);
    expect(isSafeAbsolutePath("/opt/apps/my-app")).toBe(true);
  });

  it("rejects relative paths", () => {
    expect(isSafeAbsolutePath("var/www")).toBe(false);
    expect(isSafeAbsolutePath("./var/www")).toBe(false);
  });

  it("rejects path traversal attempts", () => {
    expect(isSafeAbsolutePath("/var/www/../../etc/passwd")).toBe(false);
    expect(isSafeAbsolutePath("/..")).toBe(false);
  });

  it("rejects shell metacharacters in paths", () => {
    expect(isSafeAbsolutePath("/var/www; rm -rf /")).toBe(false);
    expect(isSafeAbsolutePath("/var/www$(whoami)")).toBe(false);
  });
});
