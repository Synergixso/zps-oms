import { describe, expect, it } from "vitest";
import { RELEASE, STAGES, validateRelease, type ReleaseRecord } from "@/server/lib/release";
import { environment, environmentNotice } from "@/server/lib/environment";
import { withDb } from "./helpers";

describe("release lifecycle and institutional status (DEC-069)", () => {
  it("the current release record is consistent and claims no institutional approval without evidence", () => {
    expect(validateRelease(RELEASE)).toEqual([]);
    expect(STAGES).toHaveLength(8);
    expect(RELEASE.institutional.institutionalApproval.label).toBe("Awaiting Formal Institutional Approval");
    for (const d of Object.values(RELEASE.institutional)) expect(["APPROVED", "AUTHORISED"]).not.toContain(d.state);
  });

  it("refuses an approval or deployment recorded without evidence", () => {
    const approved: ReleaseRecord = { ...RELEASE, institutional: { ...RELEASE.institutional, institutionalApproval: { state: "APPROVED", label: "Approved" } } };
    expect(validateRelease(approved).join()).toMatch(/approval needs a reference/);
    const withEvidence: ReleaseRecord = { ...RELEASE, institutional: { ...RELEASE.institutional, institutionalApproval: { state: "APPROVED", label: "Approved", evidence: { reference: "ZPS/OPS/2027/001", authority: "Office of the Inspector General", effectiveDate: "2027-01-15", location: "docs/governance/approvals/" } } } };
    expect(validateRelease(withEvidence)).toEqual([]);
    expect(validateRelease({ ...RELEASE, stage: "PRODUCTION_DEPLOYMENT" }).join()).toMatch(/deployment authorisation/);
    expect(validateRelease({ ...RELEASE, stage: "PRODUCTION_READY" }).join()).toMatch(/security verification/);
    expect(validateRelease({ ...RELEASE, stageEvidence: [] }).join()).toMatch(/evidence/);
  });

  it("labels environments from configuration, never hides synthetic data", () => withDb(async (db) => {
    const before = process.env.ZPS_ENVIRONMENT;
    try {
      delete process.env.ZPS_ENVIRONMENT;
      expect(environment()).toBe("development");
      const dev = await environmentNotice(db);
      expect(dev).toMatchObject({ environment: "development", synthetic: true, banner: true });
      expect(dev.outputStamp).toMatch(/SYNTHETIC/);
      process.env.ZPS_ENVIRONMENT = "production";
      // The test database is synthetic: production must still warn.
      const prod = await environmentNotice(db);
      expect(prod).toMatchObject({ environment: "production", banner: true, label: "Synthetic data present" });
      process.env.ZPS_ENVIRONMENT = "nonsense";
      expect(environment()).toBe("development");
    } finally {
      if (before === undefined) delete process.env.ZPS_ENVIRONMENT; else process.env.ZPS_ENVIRONMENT = before;
    }
  }));
});
