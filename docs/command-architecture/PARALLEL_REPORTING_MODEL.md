# Parallel Reporting Model

Recorded 27 November 2026 for v0.11.0 (owner directive Parts 6.3, 9). Implementation: migration 014 (`reporting_relationships`, `status_reports`, `report_recipients`, `report_events`), `command.ts`.

## 1. Relationship types

| Type | Hierarchical | Carries reports | Carries instructions | Notes |
|---|:-:|:-:|:-:|---|
| PRIMARY_COMMAND | yes | yes (primary, unless a primary reporting relationship exists) | all categories | At most one per office |
| PRIMARY_REPORTING | yes | yes (primary) | no | Where reporting differs from command |
| PARALLEL_REPORTING | no | yes (parallel) | no | For example Area Commander → OC District |
| ADMIN_COORDINATION | no | yes (parallel) | administrative instructions and operations administrative tasks only | For example Area Commander → District Operations Officer |

Acting and delegated authority are deliberately **not** relationship rows. They are acting appointments on the office (`ACTING_AUTHORITY_AND_DELEGATION.md`), because they confer authority for a period, not a structural link.

Every relationship records the superior office, the subordinate office, the type, an optional channel label, the effective date, an expiry date if any, the authorising reference, its status (active or ended, with who ended it and when) and its audit history.

## 2. The report is not the channel

| Concept | Table | Cardinality |
|---|---|---|
| The report | `status_reports` | one row: one reference, one body, one originator, one originating unit |
| Each recipient office | `report_recipients` | one row per office (unique per report), with kind (primary, parallel, forwarded), status, acknowledgement, review and the relationship it came through |
| What happened | `report_events` | ordered history, each event tied to the recipient row it concerns |

No copies are made for parallel recipients, and acknowledging as one recipient never changes another recipient's record.

## 3. Loop prevention

On every new relationship, `addRelationship` refuses:
- an office reporting to itself (also a database CHECK);
- the IG office as a subordinate;
- a second primary command superior;
- any relationship whose proposed superior already reaches the subordinate through primary command or primary reporting links, whatever the new relationship's type. This rejects A→B when B→…→A already exists, while parallel channels to other branches stay possible.

All four are covered by Test I ("reporting loops are refused").
