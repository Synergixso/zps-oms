# Reporting Permission Matrix

Recorded 27 November 2026 for v0.11.0 (owner directive Parts 9, 13). Command authority comes from **offices held**, not from application roles. The only role permissions involved are for viewing and maintaining the structure.

## 1. Actions by authority

| Action | Substantive holder of the office | Acting holder | Anyone else |
|---|:-:|:-:|:-:|
| Issue a directive to an office directly below (primary command: any category; coordination: administrative instruction or operations administrative task) | ✓ | only if *issue directives* delegated | ✕ |
| Acknowledge a directive or report addressed to the office | ✓ | only if *acknowledge* delegated | ✕ |
| Assign a directive onward; record progress; report completion | ✓ | only if *assign or forward* delegated | ✕ |
| Close or cancel a directive the office issued | ✓ | only if *close or cancel* delegated | ✕ |
| Submit a report from the office | ✓ | only if *submit reports* delegated | ✕ |
| Review, return, forward or close a report received (return, forward and close: primary or forwarded recipient only) | ✓ | only if *review reports* delegated | ✕ |
| Flag a conflict between two directives received | ✓ | only if *acknowledge* delegated | ✕ |
| Decide a conflict referred to the office | ✓ | only if *decide conflicts* delegated | ✕ |
| Appoint an acting officer for the office or an office below it | ✓ | only if *appoint acting officers* delegated (offices below only) | ✕ |
| Instruct an office above, or an office two or more levels below | ✕ | ✕ | ✕ |
| Instruct through a reporting or parallel-reporting relationship | ✕ | ✕ | ✕ |

## 2. Visibility

| Record | Visible to holders of |
|---|---|
| Directive | its issuing office, its receiving office, and the issuing and receiving offices of every directive above it in the assignment chain |
| Status report | the reporting office and every recipient office (primary, parallel, forwarded) |
| Conflict | the receiving office, both issuing offices, the common superior |
| Acting appointment | the acting officer, the authoriser, holders of the office |
| Structure (offices, holders, relationships) | role permission `command.structure.view`, within its scope |

Out-of-scope requests return a neutral 404 and write a SECURITY audit event (Test I; security probes).

## 3. Role permissions (structure only)

| Role | `command.structure.view` | `command.structure.manage` |
|---|:-:|:-:|
| 02 Inspector General | N | |
| 03 DIG Operations | N | |
| 04 Commissioner – Operations HQ | N | N |
| 05 Deputy Commissioner – Operations HQ | N | |
| 09 Formation Commanding Officer · 10 Deputy Division Commander · 11 Staff I · 12 Staff II · 15 Formation Operations Staff Administrator | S | |
| 21 OC District · 22 Deputy OC District · 23 Operations Officer District | S | |
| All technical roles (01, 06, 08, 20, 26) and liaison roles (07, 19, 30, 31) | | |

Technical administrators and liaison officers cannot be appointed to, or act in, command offices (`eligibleForCommand`).

## 4. Appointment-only accounts (DEC-076)

| Rule | Enforcement |
|---|---|
| Only Sergeant and Constable offices qualify (explicit list, never derived from an undecided mapping) | `APPOINTMENT_ONLY_ELIGIBLE`; `officesHeld` filters a role-less user's offices to the allowed types |
| Own office's directives and reports only; no other module | Every other page requires a role permission the account does not have |
| Policy changed only by platform configuration, with a reason; production switch-on needs a Service decision reference; audited before and after | `setAppointmentAccess`; platform console card |
| Default: on outside production, off in production | `appointmentAccessPolicy` |
| Visible to administrators with whether access is effective; supported by technical administrators whose scope covers the office's unit | `listAppointmentOnlyAccounts`; `userInScope` |
