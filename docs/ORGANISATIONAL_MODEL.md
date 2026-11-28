# Organisational Model — ZPS-OMS

Updated 28 November 2026 (v0.13.0; DEC-078 … DEC-081). Earlier versions of this file described the whole directory as "synthetic and provisional" and limited the unit types to HQ, Divisions and formations; both statements are superseded.

**Two kinds of record, never confused:**

| Kind | What it covers | `org_units.synthetic` | Source |
|---|---|---|---|
| **Established structure** | The ten Provincial Divisions; the named formations; Kamfinsa Mobile Unit's five Companies and six stated Detachments with duty stations | `0` | Confirmed by the ZPS project stakeholders (directive 28 Nov 2026, DEC-078); national context cross-checked against the official website (`command-architecture/OFFICIAL_PUBLIC_REFERENCES.md`) |
| **Synthetic development record** | Districts, Stations and Posts used for development and tests; the two KMU training units ("1 Detachment, A/B Company (synthetic training unit)") and their Platoons and Sections; every person, account, office holder and service number | `1` | Development only; labelled "synthetic" on screen |

The organisation directory and each unit page show the record basis ("Established" / "Synthetic") and the duty station.

## 1. Principles
1. The software represents the institution; it does not create command authority. Command authority comes from appointments to offices (DEC-074), not from units, roles or ranks.
2. Stable identifiers never change; names, parents and status are effective-dated.
3. History is preserved: relationships are end-dated, units are deactivated, nothing referenced is deleted.
4. A structural change never grants or removes user access.
5. Precedence of sources: confirmed instructions of the authorised ZPS stakeholders › approved project requirements › approved establishment and documented arrangements › project documentation › current software › generic recommendations.

## 2. Unit types (`org_units.unit_type`, database CHECK)
`SERVICE_HQ`, `HQ_OFFICE`, `PROVINCIAL_DIVISION`, `DISTRICT`, `STATION`, `POST`, `FORMATION`, `DEPARTMENT`, `COMPANY`, `DETACHMENT`, `PLATOON`, `SECTION`. Allowed parent → child pairs are configuration (`org_type_rules`), e.g. FORMATION → COMPANY → DETACHMENT → PLATOON → SECTION; DIVISION → DISTRICT → STATION → POST.

`duty_station` (migration 016) records where a unit is based (e.g. "Kitwe, Copperbelt Province"). It is administrative metadata, never a tracked, live or tactical position.

## 3. Established structure

**Provincial Divisions:** Lusaka, Copperbelt, Central, Southern, Eastern, Northern, Luapula, Western, North-Western, Muchinga.

**Formations under the DIG Operations portfolio** (official website R4): Kamfinsa School of Public Order Maintenance (SPOM) / Mobile Unit; Paramilitary Battalion; TAZARA Division; Airport Division; Protective Unit; Police Air Wing; Crime Prevention and Support Services; National Command Centre.

**Kamfinsa Mobile Unit (DEC-078):**

| Company | Detachment | Duty station | Unit id |
|---|---|---|---|
| HQ Company | HQ 5 Detachment | Kitwe, Copperbelt Province | `org_mu_hq5` |
| A Company | A2 Detachment | Kabwe, Central Province | `org_mu_a2` |
| A Company | A4 Detachment | Mansa, Luapula Province | `org_mu_a4` |
| B Company | B4 Detachment | Sikanze Police Camp, Lusaka | `org_mu_b4` |
| C Company | — (not yet supplied, issue #3) | — | — |
| D Company | D3 Detachment | Mufulira, Copperbelt Province | `org_mu_d3` |
| D Company | D4 Detachment | Choma, Southern Province | `org_mu_d4` |

Companies: `org_mu_hq`, `org_mu_a`, `org_mu_b`, `org_mu_c`, `org_mu_d`. Further Detachments, Platoons and Sections are added through the organisation registry (WF-03) when the Service supplies them; nothing is invented to make the directory look complete.

## 4. Relationships (`org_relationships`)
`child_id`, `parent_id`, `relationship` (`REPORTS_TO` | `ADMINISTERED_BY`), effective dates, `approval_ref`. One open relationship per unit; the directory can be viewed as at any date. The closure table (`org_unit_closure`) gives subtree scope.

## 5. Change control (WF-03)
`CREATE_UNIT`, `RENAME_UNIT`, `CHANGE_PARENT`, `DEACTIVATE_UNIT` → proposed by an organisation registry administrator → decided by a different user with an `ORG_CHANGE` delegation at HQ (approval reference mandatory) → applied on the effective date.

## 6. Scope semantics
A role assignment names one unit with coverage `UNIT`, `SUBTREE` (via the closure table) or `NATIONAL` (HQ assignments only). Command offices sit on units but confer command authority only to their holders (DEC-074); reading personnel additionally needs personnel scope.

## 7. Open items
Full KMU Detachment / Platoon establishment (#3); the KMU HQ office Company Commanders report to (#2); authoritative national establishment and controlled import (#8).
