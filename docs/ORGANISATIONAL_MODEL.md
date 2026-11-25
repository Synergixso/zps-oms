# Organisational Model — ZPS-OMS

Status: proposed model; organisational content is **synthetic and provisional** pending the signed current DIG Operations establishment (Exit Gate 2).

## 1. Principles
1. The software represents the approved structure; it does not create command authority.
2. Stable internal identifiers never change; names, parents and status are effective-dated.
3. History is preserved: relationships are end-dated, units are deactivated, nothing referenced is deleted.
4. A structural change never grants or removes user access. Access derives only from role assignments.
5. Precedence of sources: signed internal establishment › signed directives › public pages/organograms › developer assumptions.

## 2. Entity types (`org_units.unit_type`)

| Type | Meaning | Seeded |
|---|---|---|
| `SERVICE_HQ` | Service Headquarters — Deputy Inspector General of Police - Operations (DIG Operations) (root, national scope anchor) | 1 |
| `HQ_OFFICE` | Optional intermediate HQ office/directorate (e.g. supervisory positions between DIG Ops and formations) | 0 (DEC-004) |
| `PROVINCIAL_DIVISION` | One of the ten Provincial Police Divisions | 10 |
| `FORMATION` | Authorised Divisional Unit / formation | 8 |

No other types are permitted (database CHECK constraint). Districts, stations and posts cannot be represented.

## 3. Seeded synthetic directory

**Provincial Police Divisions:** Lusaka, Copperbelt, Central, Southern, Eastern, Northern, Luapula, Western, North-Western, Muchinga — each `REPORTS_TO` Service HQ.

**Formations (examples from the master prompt):** Mobile Unit Division / SPOM, Kamfinsa; Paramilitary Battalion; Protective Unit; Airport Division; TAZARA Division; Crime Prevention and Support Services; Police Air Wing; National Command Centre — each `ADMINISTERED_BY` Service HQ (deliberately *not* asserting a direct command line; DEC-018).

Every seeded unit carries a validation note and `approval_ref = NULL` / `SYN-BASELINE`.

## 4. Relationships (`org_relationships`)
`child_id`, `parent_id`, `relationship` (`REPORTS_TO` | `ADMINISTERED_BY`), `effective_from`, `effective_to`, `approval_ref`. A unit has at most one open (`effective_to IS NULL`) relationship. The directory can be viewed **as at any date**.

## 5. Change control (WF-03)
`CREATE_UNIT`, `RENAME_UNIT`, `CHANGE_PARENT`, `DEACTIVATE_UNIT` → proposed by Organisational Registry Administrator → decided by a different user with an `ORG_CHANGE` delegation at HQ (approval reference mandatory) → applied automatically on the effective date. Service HQ cannot be re-parented or deactivated.

## 6. Scope semantics
A role assignment names exactly one org unit. Coverage `UNIT` applies to records owned by that unit only (no inheritance). Coverage `NATIONAL` applies across all units and only when the assignment is held at Service HQ. Formations are never visible to provincial users (and vice versa) unless an explicit assignment exists.

## 7. Open items
Intermediate HQ positions (DEC-004); final formation list (ASM-002); whether some formations report to provinces; temporary attachments / acting arrangements (PRD §7.1 — not implemented pending policy).
