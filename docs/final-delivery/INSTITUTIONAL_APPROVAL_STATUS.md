# Institutional Approval Status

Recorded 27 November 2026; reviewed for v0.10.0. Source of truth in code: `src/server/lib/release.ts` (shown on the platform console and checked by `tests/release.test.ts`).

Engineering progress and institutional authorisation are separate records. Nothing in this repository is, or implies, a Zambia Police Service approval, signed authority, procurement award or endorsement. The software stage is set from test evidence; every institutional item below stays as it is until genuine evidence is supplied.

| Item | Status | Evidence held |
|---|---|---|
| Project proposal | Prepared: Master PRD v1.0 and the owner's directives are the requirements baseline. Formal submission to the Service is not recorded in this repository | `docs/ZPS-OMS_Master_PRD_and_Claude_Code_Blueprint_v1.0.docx` |
| Institutional review | Not recorded: no review outcome has been supplied | — |
| Institutional approval | **Awaiting Formal Institutional Approval** | — |
| Technical approval (Service ICT authority) | Not recorded | — |
| Production deployment authorisation | **Not authorised** | — |

## Decisions awaiting the Service

The institutional decisions pack (`docs/governance/INSTITUTIONAL_DECISIONS_PACK.md`, items A1–A5, B1–B8, C1–C5) lists what the Service must decide before production use, including:

- the role catalogue and permission allocation (31 roles, DEC-072), delegations and approval chains, and the authorised reassignment of any account flagged when a role left the catalogue;
- the four Police Intelligence Officer roles: an information-security and legal review of the liaison metadata, the administrative classification list and retention, and confirmation that the metadata-only boundary is acceptable (DEC-073). No intelligence content is in scope without a separate authorised proposal;
- tenure, renewal and early-withdrawal policy (the 365-day minimum tenure is a configurable development default, DEC-041);
- identifier formats for production (service numbers, vehicle registrations, asset tags, store codes): until set, production refuses those registrations (DEC-069);
- retention periods (NFR-013) and the correspondence document-storage policy (DEC-068);
- the identity provider for single sign-on and multi-factor authentication (DEC-039);
- production infrastructure, hosting and the security assessment (`DEPLOYMENT_READINESS.md`).

## Recording an approval

When an approval is supplied, record it in `RELEASE.institutional` with its state (`APPROVED` or `AUTHORISED`), the document reference, approving authority, effective date and where the evidence is held (for example `docs/governance/approvals/`). `validateRelease` refuses an approval without all four, and refuses the *Production deployment* stage without a recorded deployment authorisation. Add a dated line to the item's history; never overwrite an earlier state.
