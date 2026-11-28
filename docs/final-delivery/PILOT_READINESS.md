# Institutional Pilot Readiness Assessment — Kamfinsa Mobile Unit

Phase 8 of `docs/MASTER_DEVELOPMENT_PLAN.md` (institutional compliance directive, 28 Nov 2026). Prepared for v0.13.0; updated for v0.14.0 (issue resolution).

Software completion, institutional approval and production readiness are three separate things (directive §28). This assessment says what the software can do now, what blocks a controlled pilot, what can be done in the meantime, and how each item is accepted. It records no Service approval; approvals are recorded only as described in `INSTITUTIONAL_APPROVAL_STATUS.md`.

## 1. Overall position

| Dimension | Position (v0.14.0) | Evidence |
|---|---|---|
| Software implementation | 89.9 % of weighted acceptance criteria implemented, 89.5 % verified; every implementable criterion delivered; the remainder is blocked by Service decisions or external dependencies | `UPDATED_IMPLEMENTATION_PERCENTAGES.md` (generated) |
| Kamfinsa Mobile Unit structure and field command | 12 of 13 criteria verified; K-13 (full detachment list) blocked | status register K-01 … K-13 |
| Automated verification | Type check, lint, unit/integration, Playwright journeys, route audit, security probes, production build, CI | `CHANGELOG.md` [0.13.0] "Verified"; GitHub Actions |
| Institutional approval | **Awaiting formal institutional approval** | `INSTITUTIONAL_APPROVAL_STATUS.md` |
| Production readiness | **Not ready**: infrastructure, penetration test, identity provider, identifier formats and the approved malware scanner outstanding. Infrastructure-independent preparation done: `npm run check:config`, deployment runbook, controlled import, fail-closed uploads | `PRODUCTION_READINESS_REPORT.md` |

**Assessment:** ready for a **supervised demonstration and user-acceptance walk-through with synthetic data** at Kamfinsa Mobile Unit now. **Not ready** for a pilot holding real personnel records until items P-1 to P-6 below are closed.

## 2. What a pilot at Kamfinsa Mobile Unit can exercise today (synthetic data)

- The established Companies (HQ, A, B, C, D) and Detachments (HQ 5, B4, A2, A4, D3, D4) with duty stations, in the organisation directory.
- Company Commander, Deputy Company Commander and Detachment Commander offices; reports from a Detachment reach the Company Commander (primary) and Deputy (parallel); instructions flow downward only; the Deputy acts only under a dated acting appointment.
- The Platoon Commander's workspace and daily attendance register; the Area Commander's coordination workspace (attendance counts, both reporting channels, partner engagement register).
- Directives with the full accountability record; reports with one record and one recipient row per office; conflicts referred to the common superior; reminders and escalations.
- Personnel registry, manpower requests and contributions, rosters, duty-area assignments, transfers, tenure and renewals, administrative requests, fleet, assets, stores, calendar, correspondence, dashboards, reports, notifications, audit.

## 3. Blocking items for a pilot with real records

| # | Item | Responsible authority | Required action | Blocking impact | Interim arrangement | Acceptance criteria | Issue |
|---|---|---|---|---|---|---|---|
| P-1 | Institutional approval and pilot authorisation (X-10) | ZPS command / Technical Services Section | Authorise the controlled pilot | No real data may be loaded | Synthetic demonstration only | Authorisation reference recorded in `RELEASE.institutional` | [#16](https://github.com/Synergixso/zps-oms/issues/16) |
| P-2 | Production infrastructure (X01: M14-4, M15-3) | ZPS ICT | Provide server, network placement, TLS certificate, backup target | Cannot host the pilot | Local development only | Deployment runbook executed; restore drill passed on the target | [#11](https://github.com/Synergixso/zps-oms/issues/11) |
| P-3 | Independent penetration test and DPIA (X-08) | ZPS ICT security / approved assessor | Commission the test on the pilot environment | Real personal data cannot be held | Internal probes on every release (43 in development) | Report received; high/critical findings fixed and retested | [#13](https://github.com/Synergixso/zps-oms/issues/13) |
| P-4 | Personnel and establishment data (M01-5) | ZPS HQ / Human Resource | Supply the Kamfinsa establishment and approve a controlled personnel import | Registry would be empty | Synthetic personnel | Import validated on a non-production copy | [#8](https://github.com/Synergixso/zps-oms/issues/8) |
| P-5 | Official identifier formats (M03-5, M10-3) | ZPS Human Resource / Records | Supply service-number and registration formats | Production refuses those registrations (DEC-069) | Synthetic `SYN-` formats | Validators implemented and tested | [#10](https://github.com/Synergixso/zps-oms/issues/10) |
| P-6 | Complete KMU detachment and platoon list (K-13) | Kamfinsa Mobile Unit administration | Supply all Detachments, Platoons, Sections, duty stations | Units not supplied cannot be used | Six stated Detachments + labelled training units | Units loaded through the organisation registry; placeholders retired | [#3](https://github.com/Synergixso/zps-oms/issues/3) |

## 4. Decisions that do not block a synthetic pilot but must precede production use

| Item | Responsible authority | Interim arrangement in the software |
|---|---|---|
| Role catalogue reference — 27 vs 31 (DEC-081) | Project Manager | 31-role catalogue kept |
| KMU HQ office to which Company Commanders report (DEC-079) | Project Manager / KMU command | Divisional Commander, Mobile Unit (configurable) |
| Area Commander application role (M-3) | Project Manager / DIG Operations | Office-based access only |
| CF-1 conflict referral office | ZPS command | Not activated; common-superior referral |
| H-3 DIG Administration read access | IG / DIG Operations | Restriction kept |
| C-18 DEC-075 sign-off | Authorised Service officers | No approval recorded |
| Single sign-on (M02-8) | ZPS ICT | Local accounts, scrypt hashing, lockout, MFA-ready |
| Malware scanning (M17-3) | ZPS ICT security | Type/size checks; uploads restricted in production |
| M05-5 .xlsx in licensed Excel | Project Manager | CSV, PDF and .xlsx exports available |
| X-04 manual assistive-technology audit | Project Manager | Automated WCAG 2.2 AA checks on every release |

## 5. Pilot acceptance criteria (proposed for the Service)

1. Every pilot user signs in with an individual account; no shared accounts; access reviewed before go-live.
2. Each Kamfinsa office holder (Company, Deputy, Detachment, Area, Platoon Commander) completes the UAT scripts for their workspace (`docs/uat/`), with results recorded.
3. A directive is issued from the Divisional Commander down to a Platoon Commander and its completion reported back up, with the accountability record complete at every level.
4. A Detachment report reaches the Company Commander and Deputy; an Area Commander report reaches both channels; every recipient acknowledges its own copy.
5. Platoon attendance is recorded daily for two weeks by each pilot Platoon Commander; the Area Commander sees counts only.
6. A restore drill succeeds on the pilot environment; the audit chain verifies end to end.
7. No high or critical finding from the penetration test remains open.

## 6. Rollback and support

- Backups: backup runs and restore drills are managed from the platform console (`backup_runs`, `backup_restore_checks`); a backup is taken before every migration (done for 016 and 017 in development).
- Rollback: redeploy the previous release and restore the pre-migration backup; migrations are additive (016, 017).
- Support: the Help centre (`/app/help`), the UAT pack and the operations runbook (`docs/DEPLOYMENT_GUIDE.md`).
