# Data Dictionary — ZPS-OMS

Classification column is **proposed** (needs data-owner approval). All prototype values are synthetic. "PII" marks fields that would become personal data in production.

| Table.field | Type | Description | Proposed classification | Notes |
|---|---|---|---|---|
| org_units.id | text | Stable internal identifier | Internal | Never reused |
| org_units.code / name / short_name | text | Code and approved display name | Internal | Provisional |
| org_units.unit_type | enum | SERVICE_HQ, HQ_OFFICE, PROVINCIAL_DIVISION, FORMATION | Internal | |
| org_units.status, effective_from/to, approval_ref, validation_note | — | Lifecycle and provenance | Internal | |
| org_relationships.* | — | parent, relationship (REPORTS_TO / ADMINISTERED_BY), validity, approval ref | Internal | |
| users.username | text | Unique login identifier | Restricted (PII) | `demo.` prefix in prototype |
| users.display_name | text | Name shown in UI | Restricted (PII) | Must contain "Demo" in prototype |
| users.position_title | text | Configurable position label | Internal | Not a rank |
| users.status / status_reason | enum/text | ACTIVE, SUSPENDED, DEACTIVATED | Restricted | |
| role_assignments.* | — | role, org unit, validity, justification, granted/revoked by | Restricted | Audit-relevant |
| delegations.* | — | domain, org, category, validity, approval_ref | Restricted | |
| sessions.id | text | SHA-256 of session token | Secret-derived | Token itself never stored |
| admin_requests.title / details | text | Administrative subject & justification | Internal/Restricted | Users warned not to enter personal/operational data |
| admin_requests.priority | enum | ROUTINE, PRIORITY (administrative) | Internal | |
| request_actions.reason | text | Decision reason | Internal | |
| vehicles.fleet_ref / registration_ref | text | Synthetic identifiers (`SYN-FLT-`, `SYN-REG-`) | Restricted | Real plates rejected by validation |
| vehicles.make, model, vehicle_class, status, next_service_due, licence/insurance_expiry | — | Administrative only | Internal | **No** location, route, mission, crew fields exist |
| maintenance_requests.estimated_cost | int (ZMW) | Synthetic estimate | Internal | |
| service_records.workshop_ref / cost_ref | text | References only | Internal | |
| assets.asset_tag | text | `SYN-AST-nnnnn` | Internal | |
| assets.category_code | text | Allowlisted category | Internal | Sensitive classes not representable |
| assets.custodian_ref | text | Office/post reference | Internal | Not a person (ASM-012) |
| asset_events.before_state / after_state | JSON | Snapshot of status, condition, custody | Internal | |
| notifications.* | — | In-app message to one user | Internal | |
| report_exports.* | — | Who exported which report, fields, rows | Restricted | |
| audit_events.* | — | actor, action, outcome, entity, org, category, details, hash chain | Restricted (audit) | Keys matching pass/secret/token/cookie/session/credential are redacted |
| app_settings.* | — | Non-secret configuration | Internal | No secrets stored |

Retention: **not defined** (DEC-019). Nothing is purged.
