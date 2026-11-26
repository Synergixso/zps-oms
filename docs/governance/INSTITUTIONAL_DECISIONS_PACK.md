# Institutional Decisions Pack — ZPS-OMS

**Prepared for:** Office of the Deputy Inspector General of Police - Operations (DIG Operations) · **Date:** 26 November 2026 · **System version:** v0.7.0 (synthetic prototype)

## Why this pack
The prototype is functionally complete for its scope and verified (see `docs/role-architecture/ROLE_TEST_RESULTS.md`). Everything still open is a **decision only the Service can take**. Each item below says what is needed, who should decide, what the prototype does today (a *provisional* setting that is easy to change), and what we recommend. Nothing here needs new software before a decision; most are configuration.

Priority: **A** = needed before user acceptance testing (UAT) can be signed off · **B** = needed before a pilot with real data · **C** = needed before national roll-out.

## A. Before UAT sign-off
| # | Decision | Decide | Prototype today (provisional) | Recommendation | Ref |
|---|---|---|---|---|---|
| A1 | Confirm the 27 roles' permissions (what each role may see and do) | DIG Operations + Security | Permission templates in the catalogue; full matrix in `PERMISSION_MATRIX.md` | Review the matrix role by role during UAT; record changes as catalogue edits | DEC-049, DEC-007 |
| A2 | Who holds approval authority, for which matters and units (delegations) | DIG Operations | Synthetic delegations (`SYN-DELEG-*`) for the seeded commanders, including stores | Issue a delegation instrument per approving post; enter each with its reference | DEC-016, DEC-053, `APPROVAL_AUTHORITY_CONFIGURATION.md` |
| A3 | Approval chains: how many levels for manpower requests, assignments and transfer releases | DIG Operations | One level (manpower reinforcements: two) | Start with one level; add HQ concurrence only where policy requires it | DEC-045, DEC-058 |
| A4 | Gaps between the 27 roles and earlier functions (audit, security, personnel maintenance, organisation proposals) | DIG Operations | Audit → IG and DIG; security → Superadmin and HQ Tech; personnel maintenance → Staff I/II, Ops Officers, Station Inspector, Company Commander, Section Head | Confirm, or name the posts that should hold these functions | DEC-055 |
| A5 | Nominate the UAT lead and one tester per role | DIG Operations | — | One real post-holder (or deputy) per role; ~4 half-day sessions | `docs/uat/UAT_PLAN.md` |

## B. Before a pilot with real data
| # | Decision | Decide | Prototype today | Recommendation | Ref |
|---|---|---|---|---|---|
| B1 | Hosting, production database and security accreditation | High Command + Technical Services | Local XAMPP only | Government-hosted server; MariaDB/MySQL with the least-privilege accounts script; accreditation before any real data | DEC-023 |
| B2 | Sign-in method: passwords only, or Government ID (SSO) / MFA | Technical Services + Security | Username + password, lockout; SSO button shown as unavailable | Keep passwords for the pilot with MFA as the next step; SSO when an identity provider is approved | DEC-031, DEC-039 |
| B3 | Use of AI tooling on institutional material | Technical Services + Legal | Used on synthetic data only | Keep AI tooling away from real data unless approved | DEC-022 |
| B4 | Retention periods (audit, deliveries, notifications, personnel history) | Records / Legal | Nothing is purged except 30-day report deliveries and 90-day sign-in attempts | Set periods per record class; the system can enforce them as automation jobs | DEC-019 |
| B5 | Tenure rules: minimum tenure, renewal period, review window, exception categories | DIG Operations | 365 / 365 / 30 days; Misconduct always available | Confirm or set the policy values (configuration) | DEC-041 |
| B6 | Fleet register: is ZPS-OMS the system of record or does Technical Services keep one? | Technical Services | Prototype register | Avoid two registers: either adopt this one or link to the existing one | DEC-009 |
| B7 | Thresholds: maintenance approval amount; request overdue days | DIG Operations / Finance | ZMW 5,000; 10 days | Confirm values (configuration) | DEC-014, DEC-015 |
| B8 | Approved categories: administrative requests, general assets, store items | DIG Operations / asset and stores owners | 4 request, 4 asset, 6 stores categories | Confirm the allow-lists; sensitive classes stay unrepresentable | DEC-011, ASM-011, DEC-053 |

## C. Before national roll-out
| # | Decision | Decide | Prototype today | Recommendation | Ref |
|---|---|---|---|---|---|
| C1 | Official establishment: divisions, formations, districts, stations, posts and their relationships | Establishment owner | Synthetic establishment; formations "administered by" HQ | Load the approved establishment through structure-change approvals | ASM-001–003, DEC-018 |
| C2 | Report owners, audiences and release rules | DIG Operations / data owners | 14 reports with field allow-lists; IG sees summaries only | Name an owner per report; confirm who may export | DEC-012 |
| C3 | Brand colours and crest usage | Public Relations / High Command | Provisional colours; crest unmodified | Confirm | DEC-010 |
| C4 | Modules 16 (administrative scheduling) and 17 (correspondence) | DIG Operations | Not started (later phase by design) | Specify after the pilot | — |
| C5 | Intermediate HQ supervisory posts — organisation units or roles? | DIG Operations | Not modelled | Decide with the establishment (C1) | DEC-004 |

## How to record a decision
1. Write the decision and its instrument reference in `docs/DECISION_REGISTER.md` (status *Applied*, decided by, date).
2. Configuration decisions (values, categories, delegations, chains) are entered in the application by authorised users and are audited; catalogue or structural changes go through the normal change workflow with tests.
3. Re-run the verification suite and regenerate the documentation (`npm run docs:permissions`, `npm run docs:uat`).
