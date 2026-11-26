# Requirements Traceability Matrix — ZPS-OMS

Status key: **Implemented** (code + automated test) · **Implemented (manual)** (code + manual/HTTP evidence only) · **Partial** · **Not implemented** · **Needs approval**.

| Req ID | Source | Requirement | Implementation | Verification | Status |
|---|---|---|---|---|---|
| SCOPE-01 | Directive §3 (supersedes Prompt C) | HQ, 10 divisions, districts, stations, posts, formations and sub-units | `org_units` types, `org_type_rules`, closure, seed | seed test (hierarchy + closure) | Implemented |
| SCOPE-02 | Prompt C4 | No excluded capabilities | No modules; allowlists; term screening | prohibited-class test; review | Implemented |
| M01-01 | PRD §7.1 | Stable IDs, effective-dated names/relationships | `org.ts`, schema | TS-15 | Implemented |
| M01-02 | PRD §7.1 | Approval workflow for structural change | propose/decide/apply | TS-15 | Implemented |
| M01-03 | PRD §7.1 | No deletion of historical units | deactivate + end-date | TS-15 | Implemented |
| M01-04 | PRD §7.1 | Evaluate against structure valid at the time | `listOrgUnits(asAt)` | TS-15 | Implemented |
| M01-05 | PRD §7.1 | Temporary attachments / acting arrangements | — | — | Needs approval |
| M02-01 | PRD §7.2 | Unique individual accounts, no shared/self-registration | `provisionUser`, no signup route | WF identity | Implemented |
| M02-02 | PRD §7.2 | Identity separate from role and org assignment | `users` / `role_assignments` | TS-09/10 | Implemented |
| M02-03 | PRD §7.2 | Expiry + justification for temporary access | `requiresExpiry`, justification | TS-10 | Implemented |
| M02-04 | PRD §7.2 | Access review, disable, revoke, transfer | `iam.ts` | TS-10, WF identity | Implemented |
| M02-05 | PRD §7.2 | Cannot broaden access via URL/payload/ID | `policy.ts` | TS-02/04, route audit | Implemented |
| M02-06 | PRD §7.2 | MFA / approved IdP | — | — | Needs approval (DEC-005) |
| FR-WF-001 | PRD §7.3 | Create with approved category & owning org | `createDraft` | TS-02, WF validation | Implemented |
| FR-WF-002 | PRD §7.3 | Route per delegated authority; no self-approval | `canApprove`, steps | TS-03, TS-11 | Implemented |
| FR-WF-003 | PRD §7.3 | Submit/return/approve/reject/cancel/close | `TRANSITIONS` | WF tests | Implemented |
| FR-WF-004 | PRD §7.3 | Record actor, time, decision, reason, version | `request_actions` | WF lifecycle | Implemented |
| FR-WF-005 | PRD §7.3 | Requester sees status & next action | detail page | Manual (browser) | Implemented (manual) |
| FR-WF-006 | PRD §7.3 | Escalation of overdue items | overdue lists, no external send | Manual | Partial (no automatic escalation routing) |
| FR-WF-007 | PRD §7.3 | No editing after approval/closure except controlled reopen | `updateDraft` guard, REOPEN | TS-12 | Implemented |
| M04-01 | PRD §7.4 | Vehicle register, admin fields only | `fleet.ts` | WF fleet, review | Implemented |
| M04-02 | PRD §7.4 | Maintenance lifecycle, workshop referral, completion | `maintenanceAction` | WF fleet | Implemented |
| M04-03 | PRD §7.4 | Reminders for due dates | due-date monitor (dashboard) | Manual | Partial (no scheduled reminder notifications) |
| M04-04 | PRD §7.4 | No GPS/location/routes/mission | schema has no such fields | review | Implemented |
| M05-01 | PRD §7.5 | Allowlisted categories, unique tag | `registerAsset` | WF asset | Implemented |
| M05-02 | PRD §7.5 | Issue/return/transfer/inspect/repair/disposal with references | `assetAction` | WF asset | Implemented |
| M05-03 | PRD §7.5 | Never overwrite history | `asset_events` before/after | WF asset | Implemented |
| M06-01 | PRD §7.6 | Role-specific dashboards | `/app` variants | route audit, manual | Implemented (manual) |
| M06-02 | PRD §7.6 | Aggregate default; drill-down needs permission | aggregates; record views scoped | TS-01 | Implemented |
| M06-03 | PRD §7.6 | Report definitions with owner/fields | `REPORTS`, `report_definitions` | TS-14 | Partial (owners DEC-012) |
| M06-04 | PRD §7.6 | Exports logged | `report_exports` + audit | TS-14, HTTP check | Implemented |
| M09-01 | Prompt F | In-app notifications; external disabled | `notify`, setting | WF lifecycle | Implemented |
| M10-01 | PRD §7.9 | Auth, IAM, business, export, config events | `audit()` calls | TS-13, review | Implemented |
| M10-02 | PRD §7.9 | Append-only / tamper-evident | triggers + hash chain | TS-13 | Implemented |
| M10-03 | PRD §7.9 | No secret logging | key redaction; no secrets exist | review | Implemented |
| M10-04 | PRD §7.9 | Audit search & export | `/app/audit`, export route | Manual | Implemented (manual) |
| M11-01 | Prompt F | Health, DB, config, release | `/app/platform` | route audit | Partial (no backup/job monitoring) |
| M07, M08 | Prompt F | Scheduling, correspondence | — | — | Not implemented (later phase) |
| NFR-002 | PRD §12 | p95 targets after load model; low bandwidth | paged notification centre; small server-rendered pages (≤ 25 KB gzip HTML) | `npm run test:load`: 0 server errors at 1/10/25 users; back-office p95 ≈ 0.9 s at 10 users (local) | Baseline met against provisional budgets (DEC-066); production targets need the Service load model |
| NFR-003 | PRD §12 | Scalability | scoped, indexed queries; paged lists | load baseline at 25 users (throughput ≈ 18–20 req/s, single Node process, 4 CPUs) | Baseline only; capacity test on target infrastructure required |
| NFR-005 | PRD §12 | Security testing | threat model, negative tests | — | Partial (no pen test) |
| NFR-006 | PRD §12 | WCAG 2.2 AA | semantic, labelled, focus; label-in-name; contrast; keyboard-reachable scroll regions; phone-width review | axe-core scan, 62 page views, 0 violations; reflow at 320 px and 200 % zoom, 115 pages, 0 overflows; phone review 27/27 | Automated rules and reflow met; manual review (keyboard, screen reader) still required |
| NFR-008 | PRD §12 | Typed contracts, modular, tested | TS strict, Zod, 34 tests | tsc, vitest | Implemented |
| NFR-010 | PRD §12 | Auditability | audit + histories | TS-13 | Implemented |
| NFR-012 | PRD §12 | Africa/Lusaka, ZMW | formatting helpers | Manual | Implemented (manual) |
| NFR-013 | PRD §12 | Retention per approved schedule | — | — | Needs approval (DEC-019) |
| UI-01 | Prompt I1 | Exact crest, object-fit contain | `<Crest>` | SHA-256 match | Implemented |
| UI-02 | Prompt I2 | Green/white/blue band | `.zp-band` | Manual | Implemented |
| UI-03 | Prompt I4 | Responsive + A4 print | layout, `@page` | Manual 375 px check | Partial (tablet/print not formally tested) |
| PUB-01 | Prompt H | Six public pages, no registration, no invented contacts | `(public)/*` | Manual | Implemented |
| ROLE-DSO | Prompt D4/T2 | "Division Staff Ops" role and dashboard | `DIVISION_STAFF_OPS` | TS-03 | Implemented |
| ZERO-01 | Prompt N | ZMW 0 | free/local only | checklist | Implemented |

## Master Directive acceptance criteria (Phase 3)

| Criterion | Requirement | Implementation | Verification | Status |
|---|---|---|---|---|
| A | Hierarchical organisation and access boundaries | `org.ts` (closure rebuild, cycle refusal), `policy.ts` SUBTREE scope | seed test; auth-scope test "SUBTREE coverage…"; route audit | Implemented |
| B | Officer registered once with home unit; duplicates prevented | `personnel.ts` registerPersonnel (unique service number, similar-name confirmation), memberships | personnel-assignments tests (criterion B) | Implemented |
| C | Operations staff initiate and route manpower requests | `manpower.ts` create/submit/review/approve, setRequirement | manpower test (criterion C); e2e roster flow | Implemented |
| D | Contributions consolidated into a roster without retyping | buildRoster from accepted contribution entries (registry ids, snapshots) | manpower test (D); e2e roster flow | Implemented |
| E | Duplicates, conflicting assignments and outdated records detected | validateVersion; eligibilityOf | manpower test (E) | Implemented |
| F | Assignment linked to personnel record and duty area | `assignments.ts` proposeAssignment/decideAssignment; finaliseRoster | personnel-assignments test (F); e2e assignment flow | Implemented |
| G | Transfer closes old, creates new, preserves history | initiateTransfer → releaseDecision → acceptDecision (one transaction) | personnel-assignments test (G); e2e transfer flow | Implemented |
| H | 365-day tenure; early withdrawal only with approved exception | computeTenure, assertTenureOrException, exceptions (Misconduct always available) | personnel-assignments test (H) | Implemented |
| I | Renewal preserves commencement and sets next review | renewAssignment | personnel-assignments test (I); e2e renewal flow | Implemented |
| J | Tenant and scope isolation | server-side scope filters; loadOr404 | auth-scope tests; route audit (404 / ✕ cells) | Implemented |
| K | Reports and printable personnel lists | reports module; roster print view; CSV exports | e2e roster print/export | Implemented |
| L | Traceable audit events | audit() on every submission, amendment, transfer, approval, renewal, disposition change | manpower and assignment tests assert audit rows | Implemented |
| M | No decorative or non-functional controls | SSO button disabled with explanation; all figures from live queries | review; route audit | Implemented |
| AUTH | Password authentication with lockout | `auth.ts`, sign-in action, temporary passwords | auth-scope tests; e2e login | Implemented |
| RBAC-27 | Three-tier 27-role catalogue (supersedes the 41 roles, DEC-049) | `catalogue.ts`, seed step 003 | auth-scope "defines exactly the 27 roles"; three-tier-roles matrix | Implemented |
| ROLE-WS | Role-specific back offices (27 workspaces) | `workspace-config.ts`, `workspaces.ts`, layout, overview | three-tier-roles tests; route audit; phone review 27/27 | Implemented |
| ROLE-CTX | Controlled context switching | `sessions.ts`, `policy.loadActor`, account menu | three-tier-roles tests; Playwright context-switching journey | Implemented |
| ROLE-TECH | Scoped technical administration; technical roles never approve | `iam.ts` (`user.support`), `platform.operate` | three-tier-roles tests | Implemented |
| STORES | General stores, requisitions, reorder automation, stores reports | `stores.ts`, jobs, reports | three-tier-roles stores tests | Implemented |
| M09-CHAIN | Configurable chains for assignment approval and transfer release | `decision-chains.ts`, migration 009 | decision-chains tests | Implemented |
| M12-SCHED | Scheduled report delivery; native Excel export | `report-schedules.ts`, `lib/xlsx.ts` | report-schedules, xlsx tests | Implemented |
| OPS | Restore drills, health endpoint, strict SQL mode, CI, audit-chain integrity under concurrency | `platform.ts`, `/api/health`, `sql-mode.ts`, `.github/workflows/ci.yml`, `audit.ts` | automation-platform, audit-chain tests; route audit; verify:audit | Implemented (CI not yet observed on GitHub) |
