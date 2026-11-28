/** Deployment configuration check (issue #11). Pure function over an environment object; no secrets are printed. */
import { describe, expect, it } from "vitest";
import { checkConfig } from "@/server/lib/config-check";

const codes = (env: Record<string, string>, level: "ERROR" | "WARN") => checkConfig(env).filter((f) => f.level === level).map((f) => f.code);

describe("deployment configuration check (#11)", () => {
  it("accepts the development configuration", () => {
    const f = checkConfig({ DATABASE_URL: "mysql://root@127.0.0.1:3306/zps_oms_dev" });
    expect(f.filter((x) => x.level === "ERROR")).toEqual([]);
    expect(f.at(-1)?.code).toBe("SUMMARY");
  });

  it("refuses unsafe production settings", () => {
    const env = { ZPS_ENVIRONMENT: "production", NODE_ENV: "development", DATABASE_URL: "mysql://root@db:3306/zps_oms_dev", ZPS_INSECURE_COOKIE: "1", ZPS_SETUP_TOKEN: "short", ZPS_FORMAT_SERVICE_NUMBER: "SYN-\\d{6}", ZPS_MALWARE_SCANNER: "acme" };
    expect(codes(env, "ERROR")).toEqual(expect.arrayContaining(["DATABASE_USER", "DATABASE_PASSWORD", "DATABASE_NAME", "INSECURE_COOKIE", "NODE_ENV", "SETUP_TOKEN", "FORMAT_serviceNumber", "MALWARE_SCANNER"]));
  });

  it("a well-formed production configuration has no errors, and lists what is still to be supplied", () => {
    const env = { ZPS_ENVIRONMENT: "production", NODE_ENV: "production", DATABASE_URL: "mysql://zps_app:s3cret@db:3306/zps_oms" };
    expect(codes(env, "ERROR")).toEqual([]);
    expect(codes(env, "WARN")).toEqual(expect.arrayContaining(["BACKUP_DIR", "FORMAT_serviceNumber", "MALWARE_SCANNER"]));
    // The check must not leave the process environment changed.
    expect(process.env.ZPS_ENVIRONMENT).not.toBe("production");
    expect(process.env.ZPS_ENVIRONMENT).not.toBe("undefined");
    expect(process.env.ZPS_MALWARE_SCANNER).not.toBe("undefined");
  });

  it("never echoes secret values", () => {
    const out = JSON.stringify(checkConfig({ ZPS_ENVIRONMENT: "production", DATABASE_URL: "mysql://zps_app:VerySecretPw@db:3306/zps_oms", ZPS_SETUP_TOKEN: "abc" }));
    expect(out).not.toContain("VerySecretPw");
    expect(out).not.toContain('"abc"');
  });
});
