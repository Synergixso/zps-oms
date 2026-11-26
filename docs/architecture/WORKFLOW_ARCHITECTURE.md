# Workflow Architecture

| Workflow | States | Decision authority | Implementation |
|---|---|---|---|
| Administrative request | DRAFT → SUBMITTED → UNDER_REVIEW (multi-level) → APPROVED → IN_PROGRESS → COMPLETED → CLOSED; RETURNED, REJECTED, CANCELLED, controlled REOPEN | ADMIN_REQUEST delegation per level (ORIGIN or HQ) | `requests.ts`; **configurable** versioned `workflow_definitions` |
| Manpower request | DRAFT → SUBMITTED → UNDER_REVIEW → RECOMMENDED → APPROVED → COMPLETED; RETURNED → resubmitted; REJECTED; CANCELLED | Review: `manpower.review` scope · Approval: MANPOWER delegation at the request's approval unit or above | `manpower.ts` |
| Contribution | PENDING → SUBMITTED → ACCEPTED; RETURNED → SUBMITTED; SUBMITTED → recalled to PENDING | Contribute: `manpower.contribute` scope · Review: `manpower.review` | `manpower.ts` |
| Roster version | DRAFT/AMENDED → SUBMITTED → REVIEWED → APPROVED → FINALISED; SUPERSEDED by an approved amendment; WITHDRAWN | Build `roster.build`; review `roster.review` (not the compiler); approve/finalise MANPOWER delegation (not the compiler) | `manpower.ts` |
| Assignment | PENDING_APPROVAL → APPROVED → ACTIVE (on commencement) → TRANSFER_PENDING → CLOSED (TRANSFERRED / RELEASED / COMPLETED); REJECTED; CANCELLED | Propose `assignment.propose`; decide ASSIGNMENT delegation at the responsible unit or above | `assignments.ts` |
| Exception | PENDING → APPROVED → USED; REJECTED | ASSIGNMENT delegation; not the raiser | `assignments.ts` |
| Transfer | PENDING_RELEASE → PENDING_ACCEPTANCE → COMPLETED; REJECTED; CANCELLED | Releasing: ASSIGNMENT delegation over the releasing unit · Receiving: `assignment.receive` or delegation at the receiving unit; never the initiator | `assignments.ts` (completion in one transaction) |
| Renewal | Decision RENEWED (continuous start kept, next review set) or NOT_RENEWED (completed) | ASSIGNMENT delegation | `assignments.ts` |
| Organisation change | SUBMITTED → APPROVED → APPLIED (on effective date); REJECTED | ORG_CHANGE delegation at HQ; not the proposer | `org.ts` |

Every transition writes `approval_actions` (or `request_actions` / `maintenance_actions`) with actor, unit, from/to status, comment and time, plus a hash-chained audit event; affected officers' disposition changes are written to `disposition_history`; the counterpart is notified in-app.

**Gap (Module 09):** the personnel-module state machines are fixed in code; their routing (who decides) is configurable through delegations, but stages are not yet configurable through `workflow_definitions`. Overdue escalation is not yet implemented. Both are scheduled in the roadmap (Phase 10).
