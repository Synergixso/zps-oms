# National Command Hierarchy

Recorded 27 November 2026 for v0.11.0 (owner directive, Parts 4, 5.1, 10, 11; DEC-074, DEC-075). Implementation: `src/server/domain/command.ts`, migration 014, seed step 014. All data synthetic.

## 1. The rule

**The Inspector General of Police (IG) is the overall head of the Zambia Police Service and the highest command authority in ZPS-OMS.** The IG office has no superior. Deputy Inspector General offices are subordinate to the IG, and the relationship is never reciprocal.

| Office | Reports to | Operations authority in ZPS-OMS |
|---|---|---|
| Inspector General of Police | — (none) | Highest; issues directives downward; receives executive reports |
| DIG – Operations | IG | Operations chain: instructs the Commissioner – Operations HQ |
| DIG – Administration | IG | **None**: no relationships below it in the Operations chain; no holder configured |
| DIG – Special Duties (Stately) | IG | **None**: same as above |
| Commissioner – Operations HQ | DIG Operations | Instructs Divisional / Formation Commanders |
| Deputy Commissioner – Operations HQ | Commissioner | Acts for the Commissioner **only** under a recorded acting appointment |

## 2. How it is enforced

| Requirement | Enforcement | Test |
|---|---|---|
| IG has no superior | `addRelationship` refuses any relationship with the IG office as subordinate | Test A |
| DIG Operations reports to the IG | Primary command relationship DIG Operations → IG; a DIG report's only primary recipient is the IG office | Test A |
| No DIG (or anyone) can instruct the IG | Directives go only to an office directly **below** the issuer; an office in the issuer's command chain is refused with "Instructions flow downward only" and a SECURITY audit event | Test A |
| Other DIG offices are not in the Operations chain | No relationship has DIG Administration or DIG Special Duties as superior; they cannot instruct any Operations office | Test A |
| A lower-level user cannot direct the IG | Same downward-only rule at every level | Tests A, B |
| The IG receives authorised upward reports | Reports are forwarded office by office to the IG; each forwarding is recorded | Tests A, F |
| Executive decisions recorded under the actual authority | Every directive, step and conflict decision stores the office, the user and SUBSTANTIVE/ACTING with the acting appointment | Tests B, G |
| Reports are not instructions | Reports and directives are separate records and tables; acknowledging a report confers no instruction authority | Test E |

## 3. Proposed Operations directive path (synthetic configuration)

IG → DIG Operations → Commissioner – Operations HQ → (Deputy Commissioner when acting) → Divisional Commander / Formation Commanding Officer → (Deputy Division Commander when acting) → Staff I → Staff II → Area Commander → Section/Platoon Commander (Chief Inspector) → Inspector → Sergeant → Police Officer / Constable.

Provincial Divisions use their own relationships. For example, Copperbelt runs Divisional Commander → OC District → OIC Station, with Staff I and II under the Divisional Commander. **No single reporting structure is hard-coded**: every link is a row in `reporting_relationships`, with dates and an authorising reference.

## 4. Rank, office, appointment and role are separate

| Attribute | Where | Example |
|---|---|---|
| Police rank | `personnel_records.rank_code`; indicative rank per office type | Chief Inspector |
| Organisational position (office) | `command_positions` | Section/Platoon Commander, 1 Platoon |
| Command appointment | `position_appointments` (dated, authorised, with history) | User X holds that office from a date |
| Acting appointment | `acting_appointments` (dated, delegated actions only) | Staff II acts for Staff I with *acknowledge* only |
| Application role | `role_assignments` (31-role catalogue) | Section Head |
| Permission | `role_permissions` | `manpower.contribute` |

An office records a **proposed** application role (`mapped_role_code`, flagged "to be validated"); the mapping confers nothing. No new RBAC role was created for Police Officer, Sergeant, Inspector, Chief Inspector or Area Commander.

## 5. Mapping gaps for the project owner (DEC-075, DEC-076)

| Office | Proposed mapping | Status |
|---|---|---|
| Divisional Commander | Formation Commanding Officer (role 09) | Plausible; requires validation |
| Area Commander (Mobile Unit) | Company Commander (role 13) | **Uncertain**: Area Commander may be a distinct appointment; requires validation |
| Section/Platoon Commander (Chief Inspector) | Section Head (role 14) | Requires validation |
| Inspector | Section Head (role 14) | Requires validation |
| Sergeant, Police Officer / Constable | **None of the 31 roles** | Appointment-only access to their own directives and reports, behind `command.appointment_access` (on by default outside production). **Owner decision required** |
| DIG Administration, DIG Special Duties | None | Recorded as offices under the IG for hierarchy only; no ZPS-OMS Operations authority |
