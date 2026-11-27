# Changelog

All notable changes to ZPS-OMS. Dates are Africa/Lusaka.

## [0.9.0] — 2026-11-27 — Full-system completion directive: Modules 16 and 17, production readiness
### Added
- **Module 16 — administrative scheduling** (`/app/calendar`): non-sensitive events (meetings, deadlines, review appointments, administrative training, records inspections) with no location field and operational-term screening; month agenda merging events with assignment review dates, contribution deadlines, own tasks and correspondence follow-ups, all scoped server-side; reminders and outcome tasks (job `schedule.event-reminders`).
- **Module 17 — administrative correspondence** (`/app/correspondence`): incoming/outgoing register with `CORR-` references, duplicate check, assignment to officers of the unit or below, status flow to filing, follow-up dates, RESTRICTED handling, full history; PDF documents with a structural screen (scripts, launch actions, embedded files, encryption, compressed streams), SHA-256 integrity and audited sandboxed download; follow-up reminders and retention-review flags (job `correspondence.follow-ups`). Migration 012; permissions `schedule.*`, `correspondence.*` (DEC-068).
- **Module 02 — sessions and sign-in history** on the profile and account pages; per-session revocation.
- **Release lifecycle and institutional status** (`src/server/lib/release.ts`, platform console, `/api/health` stage): eight stages; approvals cannot be recorded without evidence; institutional approval shown as *Awaiting Formal Institutional Approval* (DEC-069).
- **Environments** (`ZPS_ENVIRONMENT`): labels from configuration; production refuses synthetic identifiers and accepts only the Service's configured formats; production seeds the reference baseline only; first Superadmin via token-protected `/setup`.
- Reports: `FINAL_COMPLETION_AUDIT`, `PRODUCTION_READINESS_REPORT`, `FULL_MODULE_COMPLETION_MATRIX`, `ROLE_DASHBOARD_COMPLETION_MATRIX` and `PERMISSION_VERIFICATION_REPORT` (generated, `npm run docs:completion`), `SECURITY_AUDIT`, `END_TO_END_TEST_RESULTS`, `DEPLOYMENT_READINESS`, `INSTITUTIONAL_APPROVAL_STATUS`.
- Tests: `scheduling-correspondence`, `account-activity`, `release`, `identifiers`, `production-setup`; Playwright `admin-records`, `public-site`.
### Changed
- Public website: the Modules page is removed and `/modules` redirects permanently to `/features`; navigation is Home, About, Features, Technical Team, How It Works, Contact, Login. Public text corrected to describe what is implemented (no "real-time operations", tracking, fuel, leave or training claims; role panel shows the three-tier structure).
- Hard-coded "synthetic"/"prototype" labels replaced by environment-driven labels; outputs (print, PDF, exports) carry the synthetic stamp only while synthetic data is present.
### Fixed
- A fresh production database would have been seeded with synthetic accounts (S1); application-created accounts were always flagged synthetic (S2); the demo account list could be forced on in production (S3); the page CSP replaced the stricter download policy (S5) (`SECURITY_AUDIT.md`).

## [0.8.3] — 2026-11-27 — Nonce CSP, A4 print and tablet tests
### Security
- Content Security Policy now uses a fresh nonce per request with `'strict-dynamic'`; `'unsafe-inline'` removed from `script-src` (DEC-067, THREAT_MODEL T21). API responses get `default-src 'none'`. All pages render per request so their scripts carry the nonce; measured cost is within the DEC-066 budget.
- `tests/csp.test.ts` and `e2e/csp.spec.ts`: nonce uniqueness, policy text, per-request nonce, no violations on normal pages, and a stored-XSS simulation (inline script and `onerror` handler in the server HTML) that the browser refuses.
### Added
- `e2e/print.spec.ts`: A4 print check of the roster print view, a report, the dashboard and four public pages (layout at the 180 mm printable width, chrome hidden, nothing cut off, PDF is A4 portrait); report `docs/evidence/print.md`.
- Reflow test also covers tablet portrait (768 px) and landscape (1024 px, sidebar shown).
### Fixed (found by the print check)
- Public pages printed the site navigation; it is now hidden on paper.
- Tables inside sideways-scrolling regions were cut off on paper (modules catalogue); scroll regions now print in full and tables wrap to the page width.
- Text shortened with an ellipsis on screen (dashboard activity) was cut off on paper; it now prints in full.

## [0.8.2] — 2026-11-26 — Reflow, performance baseline, limitations refresh
### Added
- `e2e/reflow.spec.ts`: WCAG 2.2 SC 1.4.10 / 1.4.4 check of 8 public pages and 107 distinct back-office pages (from every role's navigation) at 320 px and 640 px; report `docs/evidence/reflow.md`.
- `scripts/load-test.mjs` (`npm run test:load`): dependency-free load and page-weight baseline across 27 signed-in roles at 1, 10 and 25 concurrent users, with provisional budgets (DEC-066); report `docs/evidence/load-test.md`.
### Changed
- Notifications centre is paged (50 per page, newest first, filters kept, out-of-range pages clamped) instead of rendering up to 300 at once (`listNotifications`, test `tests/notifications.test.ts`).
- `docs/KNOWN_LIMITATIONS.md` rewritten for v0.8.2: it still described v0.1 (no real sign-in, no scheduler, CSV only, no E2E). It now separates Service decisions, production prerequisites and testing gaps, and lists what was resolved.
### Fixed (found by the reflow check: 5 pages scrolled sideways at 320 px)
- Form controls never grow wider than their container (long option labels); filter-bar fields may shrink.
- Card headers wrap their actions below the title on narrow screens (areas, requests, stores).
- Search bar input may shrink; technical-team service cards use a smaller tile and wrap long titles on phones.

## [0.8.1] — 2026-11-26 — Accessibility (WCAG 2.2 AA automated rules)
### Added
- `e2e/accessibility.spec.ts`: axe-core scan of 8 public pages and the dashboard and Help page of every role (62 page views), WCAG 2.0/2.1/2.2 A and AA; report in `docs/evidence/accessibility.md`; fails on any violation. Dev dependency `@axe-core/playwright` 4.14.1 (owner-approved, DEC-065).
### Fixed (found by the scan; 126 violations of 4 rules on the first run, all in shared components)
- Label in name: the public header logo link, the account-menu button and the notifications bell now expose their visible text as (the start of) their accessible name.
- ARIA: the footer colour swatches are a labelled image, not a labelled plain element.
- Contrast: system-status pills use darker green and amber (≥ 4.5:1 for white text).
- Keyboard access: wide tables that scroll sideways are focusable, named regions.

## [0.8.0] — 2026-11-26 — Handover readiness: Help centre, UAT pack, decisions pack
### Added
- **Role-aware Help centre** (`/app/help`): explains the signed-in officer's own workspace — its pages with a plain-language purpose, the approval authority actually recorded for them, the role's limits, and who gives account support — derived from the enforced configuration.
- **UAT pack** (`docs/uat/`): test plan, one generated script per role (27) and a sign-off register; `npm run docs:uat` regenerates the scripts from the configuration and synthetic accounts.
- **Institutional decisions pack** (`docs/governance/INSTITUTIONAL_DECISIONS_PACK.md`): every open decision with owner, provisional setting and recommendation, in three priority bands.
- `KPI_LABELS` (tile labels), kept equal to the dashboards by a test.
### Changed
- README, traceability matrix, testing strategy and RBAC documentation brought up to date (27 roles, v0.7 operations); the Phase 2 roles document marked superseded.

## [0.7.0] — 2026-11-26 — Operations: restore drills, health, CI, strict SQL
### Added
- Backup restore drills (migration 010): manual *Run restore drill* on System health and an automated drill every `backup.restore_drill_days` (default 7); restores into a scratch database, checks core tables, schema version and the audit hash chain, then drops it; failures notify technical operators.
- `GET /api/health` (readiness, 503 when degraded) and `?probe=live` (liveness) for uptime monitoring; no sensitive data.
- GitHub Actions CI (`.github/workflows/ci.yml`): type check, tests on MariaDB 10.4, production-dependency audit, build.
### Fixed
- **Audit chain forks under concurrency**: appends are now serialised through `audit_chain_head` (migration 011) inside the caller's transaction, so concurrent requests can no longer chain onto the same predecessor.
- **Audit records truncated after hashing**: values are fitted to their columns before hashing (full action kept in details). Found because strict SQL mode turned the silent truncation into an error.
- `scripts/verify-audit-chain.mjs` (`npm run verify:audit`): independent read-only verifier reporting content and link breaks separately.
### Changed
- Every database connection runs in strict SQL mode (XAMPP's default is non-strict), so over-long or invalid values are rejected instead of truncated.
- Production build is warning-free: dynamic file access for migrations, backups and tools is excluded from build-time tracing.

## [0.6.0] — 2026-11-26 — Stores reporting, scheduled delivery, decision chains, Excel
### Added
- Stores reports: stock position, movements (90 days), requisitions by store / requesting unit / status.
- Automation job `stores.reorder-and-requisitions`: reorder tasks for store keepers, overdue-decision tasks for delegated approvers (never the requester) and overdue-issue tasks for store keepers; tasks close automatically once resolved.
- Scheduled report delivery (`reports.scheduled-delivery` job; migration 008): daily / weekly / monthly, in-application only, owner-only audited downloads, automatic suspension when the role context or permission is gone.
- Configurable, versioned approval chains for assignment approval and transfer release (migration 009), published on the Workflow definitions page; level shown on the decision cards; inboxes and notifications follow the current level.
- Native Excel (.xlsx) export for management reports and rosters (dependency-free writer).
- Tests: `report-schedules`, `decision-chains`, `xlsx`, stores reports / job / HQ technical operations (121 tests).
### Fixed
- `platform.operate` was defined but not enforced: HQ Tech could not run jobs or backups. Job runs and backups now require `platform.operate`; settings and maintenance mode remain `platform.configure`.

## [0.5.2] — 2026-11-26 — Context switcher browser test
### Added
- Playwright journey for context switching (menu state, scope shown, records of the other context not disclosed, no switcher for single-assignment users).
### Fixed
- After switching context the account menu and notice could show the previous context until the next full load (client router cache); the layout is now revalidated on switch. Server-side checks were already correct.

## [0.5.1] — 2026-11-26 — Phone-width review of the 27 role dashboards
### Added
- `scripts/mobile-review.mjs` (`npm run review:mobile`): opens every role's dashboard at 375 × 812, records horizontal overflow and saves screenshots (`docs/evidence/mobile/`).
- Scoped "Key activity" figures for stores, transport, armourer and local technical roles.
### Changed
- Phones: short prototype notice; quick actions and tasks before the charts; only the modules the role can open; tables of up to three columns wrap instead of scrolling.
- Working panels use their own heading instead of repeating the back-office name.

## [0.5.0] — 2026-11-26 — Three-tier 27-role institutional back offices
### Added
- **27-role catalogue** in three tiers (HQ 6, Division/Formation 11, District/Station 10) with tier, number, back-office name, organisational context, assignable unit types and scoped permissions; the only active configuration (DEC-049).
- **Role-specific back offices** from one central configuration (`workspace-config.ts`): back-office name, purpose line, navigation sections, headline figures and quick actions per role; dedicated working panels for stores roles and local technical administrators (DEC-050).
- **Context switching** for users with several assignments: account-menu switcher, `sessions.active_assignment_id`, re-validated on every request, refused and audited for foreign or invalid assignments (DEC-051).
- **Scoped technical administration** for Division/Unit, District and Station system administrators: scoped user list and account support (temporary password, unlock, end sessions); `user.support`, `health.view`, `platform.operate` (DEC-052).
- **General stores**: store items, append-only stock ledger (receipt, issue, return, adjustment), requisitions to own or higher store with STORES-delegated approval and issue by the store keeper; pages under `/app/stores` (DEC-053).
- Migration 007; seed step 003 (re-map, new synthetic accounts for roles 07, 18, 23, 24, 27, synthetic stores delegations and stock); role documentation set under `docs/role-architecture/` (partly generated by `npm run docs:permissions`); `docs/development/ROLE_BACKOFFICE_DEVELOPMENT_STATUS.md`.
- `tests/three-tier-roles.test.ts` (13 tests); route audit covers the stores routes (81 routes).
### Changed
- The 41 earlier roles are RETIRED (history kept; no permissions); synthetic accounts re-mapped with revocation reasons.
- Inspector General sees national summary figures without access to individual records.
- HQ Tech supports accounts nationally; only Superadmin configures the platform and tenants.
### Security
- Retired role assignments are ignored by `loadActor` (deny by default).
- Local technical administrators cannot act on accounts outside their unit or on other technical administrators (escalated to HQ Tech).

## [0.4.0] — 2026-11-26 — Master Execution Prompt: audit, architecture, automation and administration (Phases 0–1, 9–15)
### Added
- Phase 0 audit (`docs/development/CODEBASE_AUDIT.md`), Phase 1 architecture set (`docs/architecture/*`), development status, roadmap, generated 41-role catalogue, module catalogue, testing strategy, migration history, known issues.
- **Automation engine**: ten scheduled jobs (organisation effective dates, assignment commencement and review flags, contribution reminders and overdue tracking, tenure-review reminders, overdue-approval escalation, temporary-access expiry, fleet service and document reminders, asset inspection and custody reminders, backup monitoring, housekeeping) with retries, run log, named lock and manual runs.
- **Platform administration**: verified `mysqldump` backups with SHA-256 re-verification, migration history, automation runs, error log, maintenance mode, editable non-policy settings, version information.
- **Tasks and notifications**: notification categories and preferences, de-duplicated reminders, My tasks (open / overdue / completed) closed automatically when the matter is resolved.
- **Configurable manpower approval chains**: versioned, 1–3 levels, pinned per request, published by the HQ Operations Coordinator (`workflow.configure`).
- **Tenant management** page and formation-tenant provisioning (`tenant.view`, `tenant.manage`).
- Contribution deadlines; user (`USR-`) and roster (`RST-`) references.
- Seven reports: personnel by unit, disposition summary, manpower contributions, assignments by area, tenure bands, transfers, approval activity.
- Record history for auditors (workflow, disposition, personnel changes, exports); authentication history, lockouts and session ending for security administrators.
- Operational-area profile, editing and province / status filters; duplicate and incomplete-record review.
- Least-privilege database account script `db/admin/create_app_user.sql`.
- Finer action permissions `assignment.transfer` and `assignment.renew` (separate from `assignment.propose`); `tenant.view`, `tenant.manage`, `workflow.configure`.
- Server-generated A4 roster PDF (pdfkit, MIT) with crest, grouping, page numbers and audit; print view keeps browser printing.
- Unusual-access flags job (repeated denials or failed sign-ins notify security administrators once per day, audited).
- Asset reconciliation (stock-take) with found / damaged / missing findings recorded against each asset.
- Saved custom reports: choose approved columns and sort order, preview, save, export; never wider than the user's report access.
- Migration 006 (asset reconciliation, saved reports).
- Migrations 004 and 005; tests for Test H (reassignment revokes access), Test J (reports equal database counts), the automation engine, platform and backups, workflow chains, tenants, areas, reports and history. **91 unit/integration tests, 7 end-to-end journeys, route audit 74 routes × 48 users with 0 server errors.**
### Changed
- Migration checksums tolerate line-ending conversion; `.gitattributes` keeps migration bytes unchanged.
- Route audit retries transient resets, records persistent failures as ERR, and runs against a production build (configurable concurrency).
### Security
- Client forms declare `method="post"`, so a submission before hydration can never place field values (including passwords) in the URL.

## [0.3.0] — 2026-11-26 — Personnel, manpower, rosters, assignments and password sign-in (Phase 3, stages 4–8)
### Added
- Official **System Login** page to the owner's design; username + password sign-in (scrypt), 5-failure lockout for 15 minutes, per-device throttling, Remember me, temporary passwords issued by the Platform Super Administrator with forced change, change-password on the profile.
- **41-role catalogue** (Directive §11) with UNIT / SUBTREE / NATIONAL coverage via the closure table; hierarchical delegation-based approval (DEC-038).
- **Personnel registry**: canonical records with unique service numbers, similar-name confirmation, effective-dated home-unit membership, verification by a second officer, modification history, scoped searchable/filterable/sortable/paginated register and audited CSV export.
- **Manpower requests**: create, submit, review, recommend, return/resubmit, approve/reject (delegation), contribution requirements routed to units, unit contributions selected from eligible registry personnel, recall/revise, accept/return, reuse of earlier lists with revalidation.
- **Roster builder**: consolidation from accepted contributions, grouping by unit/rank/contributor, duplicate / conflict / eligibility / outdated-record detection, manual authorised adjustments, review → approval → finalisation, immutable versions with amendments, print view (browser PDF) and audited CSV export; finalising creates the duty-area assignments.
- **Operational areas, assignments, transfers, tenure and renewals**: one current assignment per officer, 365-day minimum tenure calculation, early release only with an approved exception (Misconduct always available), two-stage transfers (releasing approval, receiving acceptance) that close the old and open a new assignment atomically, renewals that preserve the continuous start date, full disposition history.
- Role dashboards for district, station, unit (post to section), operations staff, personnel administration, assignment administration and management, plus personnel/manpower panels on the national, provincial and formation dashboards; manpower and assignment queues on Approvals.
- Migration 002; incremental synthetic seed step 002 (28 new role accounts, 260 synthetic officers, six duty areas, assignment, transfer, renewal, exception and manpower history) (DEC-040).
- 27 new Vitest tests (69 total) and Playwright end-to-end tests (`npm run test:e2e`, Microsoft Edge, dedicated `zps_oms_e2e` database).
- Modules restored to the public menu (DEC-035).
### Changed
- The synthetic role simulator is retired; the sign-in page lists synthetic accounts only in development.

## [0.2.0] — 2026-11-26 — MySQL data layer and organisational hierarchy (Phase 3, stages 3–4)
### Changed
- Data layer moved from SQLite (`node:sqlite`) to MySQL/MariaDB (XAMPP) via `mysql2` with raw parameterised SQL (DEC-030). Every domain function, page and server action is now async.
- Versioned SQL migrations (`db/migrations/001_core_schema.sql`) with checksum-verified `schema_migrations`; the server migrates on start and seeds the synthetic dataset only when the database has no users (guarded by a MySQL named lock).
- Nested transactions use savepoints, so a failed inner operation rolls back only its own writes.
- SQLite date arithmetic replaced by application helpers (`addDays`, `addMonths`); `julianday` ageing and approval-time figures computed in code; history ordering uses explicit `seq` columns.
- `npm run db:reset` now drops and recreates the local `zps_oms_*` database and requires `--confirm-synthetic`; it refuses any other database name.
- Route-audit script reads the MySQL database. Access matrix unchanged from the SQLite build (20 users × 40 routes, 0 server errors).
### Added
- Tenants (national, ten provincial, Mobile Unit formation); every organisation unit, vehicle, asset, administrative and maintenance request records its tenant.
- Organisation types District Command, Police Station, Police Post, Department, Company, Detachment, Platoon and Section, with configurable parent/child type rules and a synthetic sample hierarchy (Kitwe, Mufulira and Lusaka Central commands; Mobile Unit companies down to sections).
- `org_unit_closure` ancestry table, rebuilt after approved structural changes; re-parenting a unit under its own subordinate is refused.
- Tests run against `zps_oms_test` (recreated once per run, each test in a rolled-back transaction): 42 tests, including hierarchy/tenant consistency, migration idempotency, checksum drift and reset safeguards.
### Removed
- `src/server/db/schema.ts` (SQLite schema) and `scripts/reset-db.mjs`.

## [0.1.14] — 2026-11-26 — Kamfinsa technical structure
### Changed
- Technical Team page, Kamfinsa Mobile Unit structure: "Engineering & Mechanical Services (MTU)" and "Information Technology & Communications (Technical Services Section and Signals Sections)".
- IT & Communications card now states ICT is provided for the entire Kamfinsa Mobile Unit Division (previously "for the School").

## [0.1.13] — 2026-11-26 — Technical Team leadership
### Changed
- Technical Team page, Published Leadership Positions: "Deputy Officer-in-Charge – Tech" added at the top of the Kamfinsa Mobile Unit (Technical Services) list.

## [0.1.12] — 2026-11-26 — Armoured vehicle photo; menu always visible
### Changed
- Home page call-to-action photograph replaced with the owner-supplied armoured vehicle (`public/hero/cta-vehicle.webp`, 1200×800), shown in full on desktop and phone.
- Public main menu is now visible on every screen size: inline beside the brand from 1024 px (compact until 1280 px), and as an always-visible row of links beneath the brand on tablets and phones. The drop-down menu button was removed.

## [0.1.11] — 2026-11-26 — Contact details
### Changed
- Contact page details (owner instruction): phones +260 972 194 188 / +260 953 489 727; email zps-oms@zambiapolice.org.zm; technical support support@zambiapolice.org.zm; website https://zps-oms.zambiapolice.org.zm; office address Technical Services Section, Kamfinsa Mobile Unit Division Headquarters, Box 21691, Kamfinsa, Kitwe, 10101, ZAMBIA.

## [0.1.10] — 2026-11-26 — How It Works page
### Added
- How It Works page (`/how-it-works`) to the owner-approved design with the shared approved hero: five-step Operational Flow (Initiate, Review, Approve, Implement, Report & Monitor), Institutional Workflow Across Zambia (Service Headquarters, Provincial Police Divisions, Divisional Units & Formations), What ZPS-OMS Manages, and Key Benefits for Operations. Added to the public menu.

### Changed
- Public menu: Home · About · Features · Technical Team · How It Works · Contact. The full menu shows from 1280 px; narrower screens use the menu button so the header never wraps.
- Home page call-to-action image now centre-crops, ready for the armoured-vehicle photograph at `public/hero/cta-vehicle.webp`.

## [0.1.9] — 2026-11-25 — Official title
### Changed
- The national office is named "Deputy Inspector General of Police - Operations (DIG Operations)" everywhere: Service HQ record (shown on sign-in, breadcrumbs and dashboards), public pages and project documents (DEC-027).
- Migration 003 renames the Service HQ record in existing databases; migrations can now carry one-off data changes.

## [0.1.8] — 2026-11-25 — Contact page with working message form
### Added
- Contact page implemented to the owner-approved design: shared approved photo hero ("GET IN TOUCH / Contact ZPS-OMS"), Contact Information cards (phone, email, technical support, website — clickable tel/mailto/web links), Our Office, working "Send Us a Message" form, "For Faster Assistance" note and topic links (Enquiries, Support, Access, Feedback) that pre-select the form subject.
- Messages are validated on the server, stored with a reference (CON-YYYY-NNNNNN), audited, and protected by a honeypot and a per-email hourly limit (5).
- Back-office **Contact messages** inbox (`/app/messages`) for the HQ Operations Coordinator and Platform Administrator, with New/Handled filters and "Mark as handled". New permissions `contact.view`, `contact.manage`.
- Database migration 002 (`contact_messages`); existing databases upgrade automatically without re-seeding.
- 6 new tests (contact submission, validation, honeypot, rate limit, access control, v1→v2 upgrade).

### Changed
- One headquarters-photo slot (`public/brand/hq-building.webp`) now serves both the About and Contact pages.
- Our Office names the "Deputy Inspector General of Police - Operations (DIG Operations)", matching the owner's correction on the About page.

## [0.1.7] — 2026-11-25 — Technical Team page
### Added
- Technical Team page (`/technical-team`) implemented to the owner-approved design with the shared approved hero; replaces Modules in the public menu (the Modules page remains available at `/modules`).

## [0.1.6] — 2026-11-25 — Features page to the approved design
### Added
- Features page implemented to the owner-approved "ZPS-OMS Modules" design: shared approved photo hero ("SYSTEM MODULES / ZPS-OMS Modules"), nine Core System Module cards with coloured accents and icon tiles, and the "Module Access by Role" strip (Superadmin, CRM Administrator, Divisional Commander, Division Staff Ops, General User) exactly as designed.

## [0.1.5] — 2026-11-25 — About page to the approved design
### Added
- About page implemented to the owner-approved "About ZPS-OMS" design: approved photographic hero ("About the Platform"), Our Purpose with image, Our Mission and Our Vision cards, five Objectives, and five Core Values (Integrity, Service, Professionalism, Accountability, Security).
- Our Purpose names the "Deputy Inspector General of Police - Operations (DIG Operations)" (owner wording).
- Shared `PhotoHero` component (`src/components/photo-hero.tsx`) so the landing and About pages use the same approved hero.

### Notes
- The headquarters-building photograph in the design could not be extracted (the design file was not available on disk). `public/about/purpose.webp` currently holds a crop of the approved hero photography; replace it with the building photograph at the same path.

## [0.1.4] — 2026-11-25 — Footer copyright
### Added
- Footer copyright line on public pages and on every signed-in back-office page: "© <current year> Zambia Police Service. All rights reserved. Designed and developed by SPOM Technical Services Section Team." The year is rendered in the browser so pre-built pages always show the current year.

## [0.1.3] — 2026-11-25 — Landing page implemented to the approved design
### Changed
- Landing page now matches the owner-approved design in wording, figures, icon colours and composition (DEC-025): approved hero strapline and trust markers, capability card wording, "8 Integrated Operations" figure, CTA vehicle photograph and footer tagline.
- Hero photograph is a true background on screens 1024 px and wider, tuned per breakpoint so faces never sit behind text; "Illustrative imagery" label and the extra role-workspaces section removed.
- Footer rebuilt to the design (centred crest and service name); removed a sub-pixel line above the footer wave.

## [0.1.2] — 2026-11-25 — Photographic hero
### Changed
- Landing-page hero uses the owner-supplied images with a responsive layout (photo right on wide screens, stacked on tablets and phones), slow cross-fade that respects reduced motion, and an "Illustrative imagery" label (DEC-024).
- New role-based workspaces section showing the interface preview and the dashboards from the role catalogue.

## [0.1.1] — 2026-11-25 — Public site aligned to A4 reference design
### Changed
- Public header, navigation (active underline, mobile menu), landing page (hero, capabilities, figures band, call to action) and footer rebuilt after the supplied landing-page reference; secondary public pages share a navy hero with the green-white-blue wave.
- Departures from the reference (no fabricated photography/insignia, no real-time/readiness/tracking claims, labelled configured figures) recorded in `docs/UI_UX_DESIGN_SYSTEM.md`.

## [0.1.0] — 2026-11-25 — Local synthetic prototype
### Added
- Repository placed under git; Phase 1 documentation packages preserved unchanged.
- Domain core: schema v1 (22 tables), RBAC + organisational-scope policy engine, delegation-based approvals, hash-chained append-only audit, server-side sessions, synthetic seed driven through the real services.
- Modules: organisation registry with effective-dated change control; identity & access (provisioning, role + scope assignments, delegations, suspension/deactivation, access reviews); administrative request workflow (multi-level, return/resubmit, cancel, close, controlled reopen); fleet register & maintenance lifecycle with service history; general asset register with custody/transfer/inspection/disposal; reports with audited CSV export; audit explorer & evidence export; security events; platform health; in-app notifications.
- 13 role-specific dashboards including the dedicated **Division Staff Ops** workspace.
- Public pages: Landing, About, Features, Modules, Contact, Secure sign-in (synthetic role simulator).
- Tests: 34 Vitest tests incl. mandated scenarios TS-01…TS-15; route-audit script (all roles × all routes).
- Documentation set required by the master prompt (Part S) plus `PHASE2_ASSESSMENT.md` and generated permission matrix.

### Fixed during verification
- Form input no longer cleared when the server returns a validation/authorisation error.
- No page-level horizontal scrolling at 375 px width.
