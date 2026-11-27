/**
 * Software release lifecycle and institutional approval status (directive 27 Nov 2026 §2, DEC-069).
 *
 * Two separate records:
 *  1. ENGINEERING — the software's maturity stage, advanced only with recorded test evidence;
 *  2. INSTITUTIONAL — proposal, review, approval, technical approval and deployment authorisation. These are
 *     the Service's decisions. An approval can only be recorded with a reference, an approving authority, an
 *     effective date and where the evidence is held (validateRelease, tests/release.test.ts). Nothing here is
 *     inferred from engineering progress.
 * Shown on the platform console and in /api/health; documented in docs/final-delivery/INSTITUTIONAL_APPROVAL_STATUS.md.
 */
import { VERSION } from "../domain/version";

export const STAGES = [
  "DEVELOPMENT", "FEATURE_IMPLEMENTATION", "FEATURE_COMPLETE", "QUALITY_ASSURANCE",
  "SECURITY_VERIFICATION", "PRODUCTION_CANDIDATE", "PRODUCTION_READY", "PRODUCTION_DEPLOYMENT",
] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = {
  DEVELOPMENT: "Development", FEATURE_IMPLEMENTATION: "Feature implementation", FEATURE_COMPLETE: "Feature complete",
  QUALITY_ASSURANCE: "Quality assurance", SECURITY_VERIFICATION: "Security verification", PRODUCTION_CANDIDATE: "Production candidate",
  PRODUCTION_READY: "Production ready — quality assurance verified", PRODUCTION_DEPLOYMENT: "Production deployment",
};

export type DecisionState = "NOT_RECORDED" | "PREPARED" | "SUBMITTED" | "UNDER_REVIEW" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | "NOT_AUTHORISED" | "AUTHORISED";
export interface Decision {
  state: DecisionState;
  /** What the record says, in words shown to users. */
  label: string;
  /** Required for APPROVED / AUTHORISED: the document reference, authority, date and where the evidence is held. */
  evidence?: { reference: string; authority: string; effectiveDate: string; location: string };
  history?: Array<{ date: string; state: DecisionState; note: string }>;
}

export interface ReleaseRecord {
  version: string;
  stage: Stage;
  stageDate: string;
  /** Test evidence for the current stage (files under docs/). */
  stageEvidence: string[];
  /** What must happen before the next stage. */
  nextStageBlockers: string[];
  institutional: {
    proposal: Decision;
    institutionalReview: Decision;
    institutionalApproval: Decision;
    technicalApproval: Decision;
    deploymentAuthorisation: Decision;
  };
}

export const RELEASE: ReleaseRecord = {
  version: VERSION,
  stage: "PRODUCTION_CANDIDATE",
  stageDate: "2026-11-27",
  stageEvidence: [
    "docs/development/END_TO_END_TEST_RESULTS.md", "docs/final-delivery/CYBERSECURITY_VERIFICATION.md", "docs/final-delivery/PRODUCTION_READINESS_REPORT.md", "docs/final-delivery/COMPLETE_WORKFLOW_TEST_RESULTS.md",
    "docs/evidence/route-audit.md", "docs/evidence/accessibility.md", "docs/evidence/reflow.md", "docs/evidence/print.md", "docs/evidence/load-test.md",
  ],
  nextStageBlockers: [
    "Independent penetration test of a production-configured deployment (NFR-005)",
    "Production infrastructure: TLS, least-privilege database accounts, off-host backups, monitoring (DEPLOYMENT_READINESS.md)",
    "Approved identity provider for single sign-on and multi-factor authentication (DEC-039)",
    "Manual accessibility audit with keyboard-only use and a screen reader (NFR-006)",
    "Malware scanning for stored correspondence documents before production use (DEC-068)",
  ],
  institutional: {
    proposal: { state: "PREPARED", label: "Project proposal and requirements baseline prepared (Master PRD v1.0); formal submission not recorded in this repository" },
    institutionalReview: { state: "NOT_RECORDED", label: "No institutional review outcome has been supplied" },
    institutionalApproval: { state: "AWAITING_APPROVAL", label: "Awaiting Formal Institutional Approval" },
    technicalApproval: { state: "NOT_RECORDED", label: "No technical approval by the Service's ICT authority has been supplied" },
    deploymentAuthorisation: { state: "NOT_AUTHORISED", label: "Production deployment not authorised" },
  },
};

/** Problems with a release record; empty when consistent. */
export function validateRelease(r: ReleaseRecord): string[] {
  const out: string[] = [];
  if (!STAGES.includes(r.stage)) out.push(`Unknown stage ${r.stage}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.stageDate)) out.push("Stage date must be YYYY-MM-DD");
  if (STAGES.indexOf(r.stage) >= STAGES.indexOf("QUALITY_ASSURANCE") && r.stageEvidence.length === 0) out.push("Stages from quality assurance onwards need recorded evidence");
  if (r.stage === "PRODUCTION_READY" && r.nextStageBlockers.some((b) => /penetration|security/i.test(b))) out.push("Production ready cannot be recorded while security verification items are open");
  for (const [k, d] of Object.entries(r.institutional)) {
    if ((d.state === "APPROVED" || d.state === "AUTHORISED") && (!d.evidence || !d.evidence.reference.trim() || !d.evidence.authority.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(d.evidence.effectiveDate) || !d.evidence.location.trim())) {
      out.push(`${k}: an approval needs a reference, approving authority, effective date and evidence location`);
    }
  }
  const dep = r.institutional.deploymentAuthorisation.state;
  if (r.stage === "PRODUCTION_DEPLOYMENT" && dep !== "AUTHORISED") out.push("Production deployment needs a recorded deployment authorisation");
  return out;
}
