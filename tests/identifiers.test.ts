import { afterEach, describe, expect, it } from "vitest";
import { identifierField, identifierRule } from "@/server/lib/identifiers";

const saved = { env: process.env.ZPS_ENVIRONMENT, fmt: process.env.ZPS_FORMAT_SERVICE_NUMBER };
afterEach(() => {
  if (saved.env === undefined) delete process.env.ZPS_ENVIRONMENT; else process.env.ZPS_ENVIRONMENT = saved.env;
  if (saved.fmt === undefined) delete process.env.ZPS_FORMAT_SERVICE_NUMBER; else process.env.ZPS_FORMAT_SERVICE_NUMBER = saved.fmt;
});

describe("identifier formats by environment (DEC-069)", () => {
  it("development accepts only synthetic identifiers", () => {
    delete process.env.ZPS_ENVIRONMENT;
    const f = identifierField("serviceNumber", { upper: true });
    expect(f.safeParse("syn-123456").success).toBe(true);
    expect(f.safeParse("123456").success).toBe(false);
    expect(identifierField("registration").safeParse("ABC 1234").success).toBe(false);
  });

  it("production refuses registration until the Service's format is configured, and never accepts SYN- values", () => {
    process.env.ZPS_ENVIRONMENT = "production";
    delete process.env.ZPS_FORMAT_SERVICE_NUMBER;
    expect(identifierRule("serviceNumber").pattern).toBeNull();
    expect(identifierField("serviceNumber").safeParse("123456").error?.issues[0].message).toMatch(/not been configured/);
    process.env.ZPS_FORMAT_SERVICE_NUMBER = "[0-9]{5,7}";
    const f = identifierField("serviceNumber");
    expect(f.safeParse("1234567").success).toBe(true);
    expect(f.safeParse("SYN-123456").success).toBe(false);
    process.env.ZPS_FORMAT_SERVICE_NUMBER = ".*";
    expect(identifierRule("serviceNumber").message).toMatch(/accepts synthetic/);
    process.env.ZPS_FORMAT_SERVICE_NUMBER = "[unclosed";
    expect(identifierRule("serviceNumber").message).toMatch(/not a valid pattern/);
  });
});

describe("usernames by environment", () => {
  it("development requires demo. usernames; production uses a default format and refuses demo. usernames", () => {
    delete process.env.ZPS_ENVIRONMENT;
    expect(identifierField("username").safeParse("demo.cb.staffops").success).toBe(true);
    expect(identifierField("username").safeParse("ops.clerk01").success).toBe(false);
    process.env.ZPS_ENVIRONMENT = "production";
    expect(identifierField("username").safeParse("ops.clerk01").success).toBe(true);
    expect(identifierField("username").safeParse("demo.cb.staffops").error?.issues[0].message).toMatch(/not accepted in production/);
    expect(identifierField("username").safeParse("Ops Clerk").success).toBe(false);
  });
});
