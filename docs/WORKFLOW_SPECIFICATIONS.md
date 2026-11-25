# Workflow Specifications — ZPS-OMS

All routing shown is **demonstration-only** (DEC-008). Every workflow is enforced in `src/server/domain/*`; tests are in `tests/`. Every successful and denied action writes an audit event.

Legend for tests: `TS-nn` = `tests/access-control.test.ts`, `WF` = `tests/workflows.test.ts`.

## WF-01 User provisioning
- **Initiator:** Platform Administrator (`user.provision`). **Receiver:** none (account has no access).
- **Preconditions:** username unique, prefixed `demo.`; display name clearly synthetic.
- **Transitions:** — → ACTIVE (no assignments).
- **Errors:** duplicate username (shared accounts prohibited); non-synthetic name.
- **Audit:** `iam.user.provision`. **Tests:** WF identity lifecycle.

## WF-02 Organisational scope / role assignment
- **Initiator:** Platform Administrator (`grant.assign`). **Receiver:** target user (in-app notification).
- **Rules:** never self; role must be assignable at that org type; org active; user active; `requiresExpiry` roles need `valid_to` ≤ 180 days; no duplicate active assignment; justification ≥10 chars.
- **Audit:** `iam.grant.assign` (flagged `privileged` for platform/security/auditor roles). **Tests:** TS-09, TS-10, WF identity.

## WF-03 Organisational structure change
- **Initiator:** Org Registry Admin (`org.propose`). **Approver:** different user with ORG_CHANGE delegation @HQ + business role @HQ.
- **States:** SUBMITTED → APPROVED → APPLIED (on effective date) | REJECTED.
- **Rules:** proposer ≠ approver; approval reference mandatory; rejection reason mandatory; HQ cannot be re-parented/deactivated; no self-parenting; old relationship end-dated; assignments untouched.
- **Audit:** `org.change.propose|approve|reject|apply`, `org.unit.renamed`. **Tests:** TS-15.

## WF-04..08 Administrative request lifecycle

```
DRAFT ─SUBMIT→ SUBMITTED ─ASSIGN→ UNDER_REVIEW(L1) ─APPROVE→ [UNDER_REVIEW(L2) ─APPROVE→] APPROVED ─START→ IN_PROGRESS ─COMPLETE→ COMPLETED ─CLOSE→ CLOSED
                                    ├─RETURN→ RETURNED ─(edit)─SUBMIT→ SUBMITTED
                                    └─REJECT→ REJECTED
DRAFT|SUBMITTED|RETURNED ─CANCEL→ CANCELLED          CLOSED ─REOPEN→ IN_PROGRESS
```

| Action | Who | Extra rules |
|---|---|---|
| CREATE (WF-04) | `request.create` at origin | Category on allowlist; origin within actor's scope (browser value re-validated); title 5–120, details 10–2000 |
| SUBMIT | Author with `request.submit` | From DRAFT/RETURNED; sets due date (+10 days, provisional) |
| ASSIGN | `request.assign` at origin | Processor must be active; sets level 1 |
| APPROVE (WF-05) | Delegation for (ADMIN_REQUEST, level org, category) + business role there | Not the author; level org = origin (ORIGIN steps) or HQ (HQ steps); advances level or → APPROVED; records `APR-<ref>-L<n>` |
| RETURN (WF-06) | As approve | Reason ≥5; author edits and resubmits |
| REJECT (WF-07) | As approve | Reason ≥5; terminal |
| CANCEL (WF-07) | Author, or assigner at origin | Reason ≥5; terminal |
| START / COMPLETE (WF-08) | `request.progress` at origin | — |
| CLOSE (WF-08) | `request.close` at origin | Terminal |
| REOPEN | `request.reopen` at origin | Justification ≥10; history preserved |
| EDIT | Author, DRAFT/RETURNED only | Category immutable; before/after audited |

- **Concurrency:** `row_version` optimistic lock; stale write → CONFLICT.
- **Notifications:** submit → assigners; assign → author + level-1 delegates; approve → next-level delegates / author; return/reject/complete/reopen → author.
- **Escalation:** overdue list on coordinator & staff dashboards and approvals page (no external notification).
- **Audit:** `request.<action>` with from/to/level/workflow version; denied attempts `request.<action>` DENIED or `authz.denied:*`.
- **Tests:** TS-03, TS-11, TS-12; WF lifecycle, rejection/cancel, concurrency, validation.

## WF-09 Fleet maintenance lifecycle

```
REQUESTED ─VALIDATE→ (cost ≥ threshold ? VALIDATED ─APPROVE→ : ) APPROVED ─REFER(workshop ref)→ ASSIGNED ─START→ IN_PROGRESS ─SUBMIT_COMPLETION→ COMPLETION_SUBMITTED ─VERIFY→ CLOSED
REQUESTED|VALIDATED ─REJECT(reason)→ REJECTED          COMPLETION_SUBMITTED ─RETURN_TO_WORKSHOP(reason)→ IN_PROGRESS
```
- Create: `maintenance.create` at vehicle's custody org; one open request per vehicle; disposed vehicles refused.
- Approve: MAINTENANCE delegation + business role at org; not the requester.
- Verify: `maintenance.verify`; verifier ≠ officer who submitted completion. Creates a service record; vehicle back IN_SERVICE; routine service resets next due (+6 months).
- START sets vehicle UNDER_MAINTENANCE.
- **Tests:** WF fleet lifecycle.

## WF-10 Vehicle service-history recording
`service.record` at custody org; date ≤ today; type from list. Audit `fleet.service.record`. Also created automatically by WF-09 verification.

## WF-11 General asset registration
`asset.register` at custody org; category on allowlist; tag pattern `SYN-AST-nnnnn`; description screened against prohibited terms. Event `REGISTER`.

## WF-12 Asset issue and return
ISSUE: IN_STORE → ISSUED with custodian office/post reference (screened). RETURN: ISSUED → IN_STORE with condition.

## WF-13 Asset transfer and inspection
TRANSFER: IN_STORE → IN_TRANSFER (destination org + authority reference). RECEIVE: by `asset.custody` at **destination** → custody changes. INSPECT: condition + timestamp. SEND_REPAIR / REPAIRED. DISPOSE: authority reference; terminal. Every event stores before/after snapshots; history never overwritten. **Tests:** WF asset lifecycle, prohibited class test.

## WF-14 Report generation
`report.view` + any domain permission listed in the definition; scope = actor's `report.view` scope. Aggregates only.

## WF-15 Controlled report export
`report.export`; requested fields must be a subset of the definition's allowlist (else DENIED + audited); CSV carries synthetic banner, formula-injection guard; row in `report_exports` + audit `report.export`. **Tests:** TS-14.

## WF-16 Privileged access modification
Assign/revoke privileged roles and delegations — Platform Admin assigns, Security Admin revokes; never self; audited with `privileged` flag.

## WF-17 User suspension / deactivation
Security Admin suspends/reactivates; Platform Admin deactivates (permanent; revokes all assignments and delegations). Sessions deleted immediately. Never self. **Tests:** TS-10.

## WF-18 Access recertification
Security Admin opens a review → snapshot of all active assignments (excluding the reviewer's own) → RETAIN/REVOKE each (reason for revoke) → auto-complete when all decided. Revocation immediate + user notified. **Tests:** WF identity lifecycle.

## WF-19 Audit investigation and evidence export
`audit.view` search by text/category/outcome/date; chain verification; `audit.export` CSV evidence (itself audited, recorded in `report_exports` as AUDIT_EVIDENCE).
