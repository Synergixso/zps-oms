import { describe, expect, it } from "vitest";
import { NON_PAGE_CSP, newNonce, pageCsp } from "@/server/lib/csp";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("content security policy (DEC-067)", () => {
  it("issues unpredictable, unique nonces", () => {
    const seen = new Set(Array.from({ length: 500 }, newNonce));
    expect(seen.size).toBe(500);
    for (const n of seen) expect(n).toMatch(/^[A-Za-z0-9+/]{22}==$/); // 128 bits, base64
  });

  it("allows only nonce-bearing scripts in production", () => {
    const csp = pageCsp("abc123", false);
    const script = directive(csp, "script-src");
    expect(script).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(script).not.toContain("unsafe-inline");
    expect(script).not.toContain("unsafe-eval");
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'");
    for (const d of ["object-src 'none'", "frame-ancestors 'none'", "form-action 'self'", "base-uri 'self'", "default-src 'self'"]) expect(csp).toContain(d);
  });

  it("adds eval and the reload socket in development only", () => {
    const csp = pageCsp("n", true);
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toBe("connect-src 'self' ws:");
  });

  it("lets nothing load from API responses", () => {
    expect(NON_PAGE_CSP).toContain("default-src 'none'");
    expect(NON_PAGE_CSP).toContain("frame-ancestors 'none'");
  });
});
